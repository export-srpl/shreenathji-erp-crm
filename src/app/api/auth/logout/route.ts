import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPrismaClient } from '@/lib/prisma';

export async function POST() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('app_session');

  // Delete session from database if it exists
  if (sessionCookie?.value) {
    const prisma = await getPrismaClient();
    await prisma.session.deleteMany({
      where: { token: sessionCookie.value },
    }).catch(() => {
      // Ignore errors if session doesn't exist
    });
  }

  const res = NextResponse.json({ success: true });

  // Determine if we're in production
  const isProduction = Boolean(
    process.env.VERCEL_ENV === 'production' || 
    process.env.NODE_ENV === 'production' ||
    (process.env.VERCEL_URL && process.env.VERCEL_URL.startsWith('https://'))
  );

  // Clear the app_session cookie
  res.cookies.set('app_session', '', {
    httpOnly: true,
    secure: isProduction,
    path: '/',
    maxAge: 0,
    sameSite: 'strict',
  });

  // Also clear the user_email cookie
  res.cookies.set('user_email', '', {
    httpOnly: true,
    secure: isProduction,
    path: '/',
    maxAge: 0,
    sameSite: 'strict',
  });

  return res;
}


