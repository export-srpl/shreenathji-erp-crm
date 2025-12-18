import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { authenticator } from 'otplib';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { logAuditEvent } from '@/lib/audit-log';

/**
 * POST /api/auth/2fa/check
 * Verify 2FA code during login
 */
export async function POST(req: Request) {
  // SECURITY: Rate limiting - 10 attempts per 15 minutes per IP
  const clientIP = getClientIP(req);
  const limit = await rateLimit(clientIP, 10, 15 * 60 * 1000);
  
  if (!limit.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many verification attempts. Please try again later.',
        retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((limit.resetTime - Date.now()) / 1000).toString(),
        }
      }
    );
  }

  try {
    const body = await req.json();
    const { email, code } = body as { email: string; code: string };

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, twoFactorSecret: true, is2FAEnabled: true },
    });

    if (!user || !user.is2FAEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: '2FA is not enabled for this user' }, { status: 400 });
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      await logAuditEvent(req, 'login_failed', 'auth', {
        userId: user.id,
        details: { reason: 'invalid_2fa_code' },
      });
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }

    // Set temporary token for completing login
    const tempToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    const isProduction = process.env.VERCEL_ENV === 'production' || 
                        process.env.NODE_ENV === 'production' ||
                        (process.env.VERCEL_URL && process.env.VERCEL_URL.startsWith('https://'));

    const res = NextResponse.json({ success: true, userId: user.id });

    await logAuditEvent(req, '2fa_verified', 'auth', {
      userId: user.id,
      details: { ipAddress: clientIP },
    });
    
    res.cookies.set('2fa_temp_token', tempToken, {
      httpOnly: true,
      secure: isProduction,
      path: '/',
      maxAge: 60 * 5, // 5 minutes
      sameSite: 'lax',
    });

    return res;
  } catch (error) {
    console.error('Failed to verify 2FA code:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA code', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

