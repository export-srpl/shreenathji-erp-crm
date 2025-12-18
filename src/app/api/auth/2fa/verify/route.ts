import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { authenticator } from 'otplib';

/**
 * POST /api/auth/2fa/verify
 * Verify a 2FA code and enable 2FA if verification succeeds
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('app_session');
    const userEmailCookie = cookieStore.get('user_email');

    // Check if user has a valid session
    if (!sessionCookie || sessionCookie.value !== 'valid') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userEmailCookie?.value) {
      return NextResponse.json({ error: 'User email not found in session' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body as { code: string };

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { email: userEmailCookie.value },
      select: { id: true, twoFactorSecret: true },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: '2FA not set up. Please generate a secret first.' }, { status: 400 });
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        is2FAEnabled: true,
      },
    });

    return NextResponse.json({ success: true, message: '2FA has been enabled successfully' });
  } catch (error) {
    console.error('Failed to verify 2FA code:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA code', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

