import { getPrismaClient } from '@/lib/prisma';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

/**
 * Update session last activity timestamp
 */
export async function updateSessionActivity(token: string): Promise<void> {
  const prisma = await getPrismaClient();
  await prisma.session.updateMany({
    where: { token },
    data: { lastActivityAt: new Date() },
  });
}

/**
 * Check if session has timed out due to inactivity
 */
export async function isSessionTimedOut(token: string): Promise<boolean> {
  const prisma = await getPrismaClient();
  const session = await prisma.session.findUnique({
    where: { token },
    select: { lastActivityAt: true, expiresAt: true },
  });

  if (!session) {
    return true;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    return true;
  }

  // Check if session has timed out due to inactivity
  const timeSinceLastActivity = Date.now() - session.lastActivityAt.getTime();
  return timeSinceLastActivity > SESSION_TIMEOUT_MS;
}

/**
 * Clean up expired and timed-out sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const prisma = await getPrismaClient();
  const now = new Date();
  const timeoutThreshold = new Date(now.getTime() - SESSION_TIMEOUT_MS);

  // Delete sessions that are expired or timed out
  const result = await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { lastActivityAt: { lt: timeoutThreshold } },
      ],
    },
  });

  return result.count;
}

