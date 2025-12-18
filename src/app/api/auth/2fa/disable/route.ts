import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for the current user
 */
export async function POST() {
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
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        is2FAEnabled: false,
        twoFactorSecret: null, // Optionally clear the secret
      },
    });

    return NextResponse.json({ success: true, message: '2FA has been disabled successfully' });
  } catch (error) {
    console.error('Failed to disable 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

