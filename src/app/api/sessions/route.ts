import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext } from '@/lib/auth';
import { getUserSessions } from '@/lib/session-manager';

/**
 * GET /api/sessions
 * Get all active sessions for the current user (or all users if admin)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = await getPrismaClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Admin can view all users' sessions, regular users can only view their own
    const targetUserId = auth.role === 'admin' && userId ? userId : auth.userId;

    // Get current session token from cookie
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const sessionCookie = cookieStore.get('app_session');
    const currentToken = sessionCookie?.value || undefined;

    const sessions = await getUserSessions(prisma, targetUserId, currentToken);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

