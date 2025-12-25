import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/security/sessions
 * Get all active and recent sessions for the current user
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const prisma = await getPrismaClient();
    
    // Get current session token from cookie
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const sessionCookie = cookieStore.get('app_session');
    const currentSessionToken = sessionCookie?.value;

    // Fetch all sessions for the user, ordered by most recent first
    const sessions = await prisma.session.findMany({
      where: {
        userId: auth.userId,
        expiresAt: {
          gt: new Date(), // Only active sessions
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Also include recently expired sessions (last 7 days) for context
    const recentExpiredSessions = await prisma.session.findMany({
      where: {
        userId: auth.userId,
        expiresAt: {
          lte: new Date(),
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
      take: 10, // Limit to 10 most recent expired sessions
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Format sessions with status
    const formattedSessions = [
      ...sessions.map(session => ({
        id: session.id,
        token: session.token,
        userId: session.userId,
        user: session.user,
        ipAddress: session.ipAddress || 'Unknown',
        device: session.device || 'Unknown',
        browser: session.browser || 'Unknown',
        os: session.os || 'Unknown',
        city: session.city || 'Unknown',
        country: session.country || 'Unknown',
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        status: 'active' as const,
        isCurrentSession: session.token === currentSessionToken,
      })),
      ...recentExpiredSessions.map(session => ({
        id: session.id,
        token: session.token,
        userId: session.userId,
        user: session.user,
        ipAddress: session.ipAddress || 'Unknown',
        device: session.device || 'Unknown',
        browser: session.browser || 'Unknown',
        os: session.os || 'Unknown',
        city: session.city || 'Unknown',
        country: session.country || 'Unknown',
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        status: 'expired' as const,
        isCurrentSession: false,
      })),
    ];

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error: any) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: error.message },
      { status: 500 }
    );
  }
}

