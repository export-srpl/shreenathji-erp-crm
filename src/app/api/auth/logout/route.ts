import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit-log';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('app_session');

  let userId: string | null = null;

  // Delete session from database if it exists
  if (sessionCookie?.value) {
    const prisma = await getPrismaClient();
    try {
      // Get user ID from session before deleting
      const session = await prisma.session.findUnique({
        where: { token: sessionCookie.value },
        select: { userId: true },
      });
      
      if (session) {
        userId = session.userId;
      }

      // Delete the session
      await prisma.session.deleteMany({
        where: { token: sessionCookie.value },
      });

      // Log logout event (non-blocking)
      if (userId) {
        logAuditEvent(req, 'logout', 'auth', {
          userId,
          details: { logoutMethod: 'user_initiated' },
        }).catch((error) => {
          console.error('Failed to log logout event:', error);
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Continue with logout even if session deletion fails
    }
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


