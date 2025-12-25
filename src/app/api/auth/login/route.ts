import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { isAccountLocked, recordFailedLoginAttempt, resetFailedLoginAttempts } from '@/lib/account-lockout';
import { logAuditEvent } from '@/lib/audit-log';
import { checkSuspiciousActivity, logSecurityAlert } from '@/lib/security-monitoring';

// Helper to run async operations in background (non-blocking)
function runInBackground<T>(promise: Promise<T>): void {
  promise.catch((error) => {
    console.error('Background operation error:', error);
  });
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    // SECURITY: Rate limiting - 5 attempts per 15 minutes per IP
    // Add timeout to rate limiting to prevent hanging
    const clientIP = getClientIP(req);
    const limit = await Promise.race([
      rateLimit(clientIP, 5, 15 * 60 * 1000),
      new Promise<{ allowed: boolean; remaining: number; resetTime: number }>((resolve) => 
        setTimeout(() => resolve({ allowed: true, remaining: 4, resetTime: Date.now() + 15 * 60 * 1000 }), 1000)
      ),
    ]);
    
    if (!limit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((limit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(limit.resetTime).toISOString(),
          }
        }
      );
    }

    const body = await req.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const prisma = await getPrismaClient();

    // Try to find an existing user by email (with timeout)
    let user = await Promise.race([
      prisma.user.findUnique({ 
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          is2FAEnabled: true,
          role: true,
          salesScope: true,
          failedLoginAttempts: true,
          lockedUntil: true,
        },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    // Bootstrap: if no user yet but the credentials match the APP_* env, create an admin user
    const envEmail = process.env.APP_LOGIN_EMAIL;
    const envPassword = process.env.APP_LOGIN_PASSWORD;

    if (!user && envEmail && envPassword && email === envEmail && password === envPassword) {
    const passwordHash = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: {
        email,
        firebaseUid: `env-${Buffer.from(email).toString('base64')}`,
        name: null,
        role: 'admin',
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        is2FAEnabled: true,
        role: true,
        salesScope: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
    }

    if (!user || !user.passwordHash) {
      // Log failed login attempt (non-blocking)
      if (user) {
        runInBackground(recordFailedLoginAttempt(user.id));
        runInBackground(logAuditEvent(req, 'login_failed', 'auth', {
          userId: user.id,
          details: { reason: 'user_not_found_or_no_password' },
        }));
      }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // SECURITY: Check if account is locked (optimized - check in-memory first)
    const now = new Date();
    const isLocked = user.lockedUntil && user.lockedUntil > now;
    
    if (isLocked) {
      runInBackground(logAuditEvent(req, 'unauthorized_access', 'auth', {
        userId: user.id,
        details: { reason: 'account_locked' },
      }));
      return NextResponse.json(
        { error: 'Account is locked due to too many failed login attempts. Please try again later.' },
        { status: 423 } // 423 Locked
      );
    }
    
    // Unlock if expired (non-blocking background task)
    if (user.lockedUntil && user.lockedUntil <= now) {
      runInBackground(prisma.user.update({
        where: { id: user.id },
        data: { lockedUntil: null, failedLoginAttempts: 0 },
      }));
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // Record failed login attempt
      const lockoutResult = await recordFailedLoginAttempt(user.id);
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      
      // Log failed login (non-blocking)
      runInBackground(logAuditEvent(req, 'login_failed', 'auth', {
        userId: user.id,
        details: { 
          failedAttempts: newFailedAttempts,
          locked: lockoutResult.locked,
          ipAddress: clientIP,
        },
      }));

      // Check for suspicious activity on failed login (non-blocking)
      // This detects patterns like multiple failures from same IP
      runInBackground(
        checkSuspiciousActivity(user.id, clientIP)
          .then((alerts) => {
            // Filter for alerts related to multiple failed logins
            const failedLoginAlerts = alerts.filter(
              alert => alert.type === 'multiple_failed_logins'
            );
            // Also check for multiple failures from same IP across different users
            return Promise.all([
              ...failedLoginAlerts.map(alert => logSecurityAlert(alert)),
              // Check for multiple failures from same IP (potential brute force)
              (async () => {
                const prisma = await getPrismaClient();
                const recentFailures = await prisma.auditLog.count({
                  where: {
                    action: 'login_failed',
                    ipAddress: clientIP,
                    timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
                  },
                });
                
                if (recentFailures >= 5) {
                  await logSecurityAlert({
                    type: 'suspicious_activity',
                    severity: 'high',
                    message: `Multiple failed login attempts (${recentFailures}) from IP ${clientIP} in the last 15 minutes. Possible brute force attack.`,
                    ipAddress: clientIP,
                    timestamp: new Date(),
                    details: { failureCount: recentFailures, timeWindow: '15 minutes' },
                  });
                }
              })(),
            ]);
          })
          .catch((error) => {
            console.error('Security monitoring error (failed login):', error);
          })
      );

      if (lockoutResult.locked) {
        return NextResponse.json(
          { 
            error: 'Too many failed login attempts. Account locked for 15 minutes.',
            lockoutUntil: lockoutResult.lockoutUntil?.toISOString(),
          },
          { status: 423 }
        );
      }

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // SECURITY: Reset failed login attempts and update last login (parallel)
    const resetPromise = resetFailedLoginAttempts(user.id);
    
    // Determine if we're in production (ensure boolean)
    const isProduction = Boolean(
      process.env.VERCEL_ENV === 'production' || 
      process.env.NODE_ENV === 'production' ||
      (process.env.VERCEL_URL && process.env.VERCEL_URL.startsWith('https://'))
    );

    // SECURITY: Use secure session token
    const crypto = await import('crypto');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Parse user agent for device, browser, and OS
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const { parseUserAgent } = await import('@/lib/user-agent-parser');
    const { device, browser, os } = parseUserAgent(userAgent);

    // Get location from IP (non-blocking - update in background if slow)
    const { getLocationFromIP } = await import('@/lib/ip-geolocation');
    const locationPromise = getLocationFromIP(clientIP);

    // Create session and reset attempts in parallel
    const [session, , location] = await Promise.all([
      prisma.session.create({
        data: {
          token: sessionToken,
          userId: user.id,
          expiresAt: sessionExpiry,
          ipAddress: clientIP,
          userAgent,
          device,
          browser,
          os,
          city: null, // Will be updated in background
          country: null, // Will be updated in background
        },
      }),
      resetPromise,
      locationPromise.catch(() => ({ city: null, country: null })), // Don't fail on geolocation error
    ]);

    // Update session with location in background (non-blocking)
    if (location.city || location.country) {
      prisma.session.update({
        where: { id: session.id },
        data: {
          city: location.city,
          country: location.country,
        },
      }).catch(err => console.warn('Failed to update session location:', err));

      // Phase 4: Check for new login location and create security alert
      try {
        const { alertNewLoginLocation } = await import('@/lib/security-alerts');
        await alertNewLoginLocation(
          prisma,
          user.id,
          clientIP,
          location.country,
          location.city,
          device,
          browser
        );
      } catch (alertError) {
        // Non-blocking - don't fail login on alert creation failure
        console.warn('Failed to create security alert for new login location:', alertError);
      }
    }

    // Clean up old sessions AFTER new session is created (non-blocking background task)
    // Keep max 3 most recent sessions per user to prevent database bloat
    runInBackground(
      (async () => {
        try {
          const allSessions = await prisma.session.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          });

          // If we have more than 3 sessions, delete the oldest ones
          if (allSessions.length > 3) {
            const keepIds = allSessions.slice(0, 3).map((s: { id: string }) => s.id);
            await prisma.session.deleteMany({
              where: {
                userId: user.id,
                id: { notIn: keepIds },
              },
            });
          }
        } catch (error: any) {
          console.error('Failed to cleanup old sessions (non-blocking):', error);
          // Non-blocking - login continues even if cleanup fails
        }
      })()
    );

    // Check if 2FA is enabled
    if (user.is2FAEnabled) {
      // Return a flag indicating 2FA verification is required
      const tempToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

      const res = NextResponse.json({ 
        success: true, 
        requires2FA: true,
        user: { id: user.id, email: user.email, name: user.name } 
      });

      // Set temporary token for 2FA verification (expires in 5 minutes)
      res.cookies.set('2fa_temp_token', tempToken, {
        httpOnly: true,
        secure: isProduction,
        path: '/',
        maxAge: 60 * 5, // 5 minutes
        sameSite: 'lax',
      });

      // Log successful login attempt (non-blocking)
      runInBackground(logAuditEvent(req, 'login', 'auth', {
        userId: user.id,
        details: { email: user.email, requires2FA: true },
      }));

      return res;
    }

    const res = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name } 
    });

    // Add rate limit headers
    res.headers.set('X-RateLimit-Limit', '5');
    res.headers.set('X-RateLimit-Remaining', limit.remaining.toString());
    res.headers.set('X-RateLimit-Reset', new Date(limit.resetTime).toISOString());

    // Set session cookies
    res.cookies.set('app_session', sessionToken, {
      httpOnly: true,
      secure: isProduction,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'strict',
    });

    res.cookies.set('user_email', user.email, {
      httpOnly: true,
      secure: isProduction,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'strict',
    });

    // Log successful login and security monitoring (non-blocking, run in background)
    runInBackground(
      Promise.all([
        logAuditEvent(req, 'login', 'auth', {
          userId: user.id,
          details: { email: user.email },
        }),
        // Security monitoring (non-blocking)
        checkSuspiciousActivity(user.id, clientIP)
          .then((alerts) => {
            return Promise.all(alerts.map(alert => logSecurityAlert(alert)));
          })
          .catch((error) => {
            console.error('Security monitoring error (login):', error);
          }),
      ])
    );

    // Log performance metric
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Login took ${duration}ms - consider optimization`);
    }

    return res;
  } catch (error: any) {
    console.error('Login error:', error);
    const duration = Date.now() - startTime;
    console.error(`Login failed after ${duration}ms`);
    
    // Return a generic error to prevent information leakage
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
