import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { cleanupExpiredSessions } from '@/lib/session-timeout';

/**
 * POST /api/auth/cleanup-sessions
 * Cleanup expired and old sessions
 * Can be called periodically via cron job or manually
 */
export async function POST(req: Request) {
  try {
    const prisma = await getPrismaClient();
    
    // Clean up expired sessions
    const expiredCount = await cleanupExpiredSessions();
    
    // Also clean up sessions per user (keep max 3 per user)
    // This prevents session bloat for users who login frequently
    const usersWithManySessions = await prisma.session.groupBy({
      by: ['userId'],
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gt: 3,
          },
        },
      },
    });

    let cleanedCount = 0;
    for (const userSession of usersWithManySessions) {
      // Get the 3 most recent sessions for this user
      const recentSessions = await prisma.session.findMany({
        where: { userId: userSession.userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true },
      });

      if (recentSessions.length > 0) {
        const keepIds = recentSessions.map(s => s.id);
        const result = await prisma.session.deleteMany({
          where: {
            userId: userSession.userId,
            id: { notIn: keepIds },
          },
        });
        cleanedCount += result.count;
      }
    }

    return NextResponse.json({
      success: true,
      expiredSessionsDeleted: expiredCount,
      excessSessionsDeleted: cleanedCount,
      totalDeleted: expiredCount + cleanedCount,
    });
  } catch (error) {
    console.error('Failed to cleanup sessions:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup sessions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

