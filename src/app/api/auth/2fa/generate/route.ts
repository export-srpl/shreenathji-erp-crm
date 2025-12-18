import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

/**
 * GET /api/auth/2fa/generate
 * Generate a new 2FA secret and QR code for the current user
 */
export async function GET() {
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

    const prisma = await getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { email: userEmailCookie.value },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate a new secret
    const secret = authenticator.generateSecret();
    const serviceName = 'Shreenathji ERP';
    const accountName = user.email;

    // Create the OTP Auth URL
    const otpAuthUrl = authenticator.keyuri(accountName, serviceName, secret);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Store the secret temporarily (user needs to verify before enabling)
    // We'll store it in the database but mark 2FA as disabled until verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        is2FAEnabled: false, // Keep disabled until user verifies
      },
    });

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret, // For manual entry if QR code doesn't work
    });
  } catch (error) {
    console.error('Failed to generate 2FA secret:', error);
    return NextResponse.json(
      { error: 'Failed to generate 2FA secret', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

