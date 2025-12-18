import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { isAccountLocked, recordFailedLoginAttempt, resetFailedLoginAttempts } from '@/lib/account-lockout';
import { logAuditEvent } from '@/lib/audit-log';
import { checkSuspiciousActivity, logSecurityAlert } from '@/lib/security-monitoring';

export async function POST(req: Request) {
  // SECURITY: Rate limiting - 5 attempts per 15 minutes per IP
  const clientIP = getClientIP(req);
  const limit = await rateLimit(clientIP, 5, 15 * 60 * 1000);
  
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

  // Try to find an existing user by email
  let user = await prisma.user.findUnique({ where: { email } });

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
    });
  }

  if (!user || !user.passwordHash) {
    // Log failed login attempt
    if (user) {
      await recordFailedLoginAttempt(user.id);
      await logAuditEvent(req, 'login_failed', 'auth', {
        userId: user.id,
        details: { reason: 'user_not_found_or_no_password' },
      });
    }
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // SECURITY: Check if account is locked
  const locked = await isAccountLocked(user.id);
  if (locked) {
    await logAuditEvent(req, 'unauthorized_access', 'auth', {
      userId: user.id,
      details: { reason: 'account_locked' },
    });
    return NextResponse.json(
      { error: 'Account is locked due to too many failed login attempts. Please try again later.' },
      { status: 423 } // 423 Locked
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    // Record failed login attempt
    const lockoutResult = await recordFailedLoginAttempt(user.id);
    await logAuditEvent(req, 'login_failed', 'auth', {
      userId: user.id,
      details: { 
        failedAttempts: user.failedLoginAttempts + 1,
        locked: lockoutResult.locked,
      },
    });

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

  // SECURITY: Reset failed login attempts on successful login
  await resetFailedLoginAttempts(user.id);
  await logAuditEvent(req, 'login', 'auth', {
    userId: user.id,
    details: { email: user.email },
  });

  // SECURITY: Check for suspicious patterns and log alerts (best-effort)
  try {
    const alerts = await checkSuspiciousActivity(user.id, clientIP);
    for (const alert of alerts) {
      await logSecurityAlert(alert);
    }
  } catch (monitorError) {
    console.error('Security monitoring error (login):', monitorError);
  }

  // Check if 2FA is enabled
  if (user.is2FAEnabled) {
    // Return a flag indicating 2FA verification is required
    // Store a temporary token in a cookie for 2FA verification
    const tempToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    const isProduction = process.env.VERCEL_ENV === 'production' || 
                        process.env.NODE_ENV === 'production' ||
                        (process.env.VERCEL_URL && process.env.VERCEL_URL.startsWith('https://'));

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

  // Determine if we're in production (Vercel sets VERCEL_ENV, or check for HTTPS)
  const isProduction = process.env.VERCEL_ENV === 'production' || 
                      process.env.NODE_ENV === 'production' ||
                      (process.env.VERCEL_URL && process.env.VERCEL_URL.startsWith('https://'));

  // SECURITY: Use secure session token instead of static "valid" string
  const crypto = await import('crypto');
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Store session in database for validation
  await prisma.session.create({
    data: {
      token: sessionToken,
      userId: user.id,
      expiresAt: sessionExpiry,
      ipAddress: clientIP,
      userAgent: req.headers.get('user-agent') || 'unknown',
    },
  });

  res.cookies.set('app_session', sessionToken, {
    httpOnly: true,
    secure: isProduction,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'strict', // Changed from 'lax' to 'strict' for better CSRF protection
  });

  // Store user email in httpOnly cookie for security (client can fetch from /api/auth/me)
  res.cookies.set('user_email', user.email, {
    httpOnly: true, // Changed to true for security
    secure: isProduction,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'strict',
  });

  return res;
}

