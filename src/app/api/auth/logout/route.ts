import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });

  // Clear the app_session cookie by setting it with maxAge 0
  // Determine if we're in production (Vercel sets VERCEL_ENV, or check for HTTPS)
  const isProduction = process.env.VERCEL_ENV === 'production' || 
                      process.env.NODE_ENV === 'production' ||
                      (process.env.VERCEL_URL && process.env.VERCEL_URL.startsWith('https://'));

  res.cookies.set('app_session', '', {
    httpOnly: true,
    secure: isProduction, // Use HTTPS cookies in production
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });

  return res;
}


