import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPrismaClient } from '@/lib/prisma';
import { isSessionTimedOut, updateSessionActivity } from '@/lib/session-timeout';

/**
 * Helper function to check if a request is authenticated
 * Returns null if authenticated, or an error response if not
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('app_session');
  
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate session token from database
  const prisma = await getPrismaClient();
  const session = await prisma.session.findUnique({
    where: { token: sessionCookie.value },
  });

  // Check if session exists and is not expired
  if (!session || session.expiresAt < new Date()) {
    // Clean up expired session
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // SECURITY: Check if session has timed out due to inactivity
  if (await isSessionTimedOut(sessionCookie.value)) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return NextResponse.json({ error: 'Session expired due to inactivity' }, { status: 401 });
  }

  // Update session activity
  await updateSessionActivity(sessionCookie.value);
  
  return null;
}

