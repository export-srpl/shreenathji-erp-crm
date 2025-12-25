import type { PrismaClient } from '@prisma/client';
import { parseUserAgent } from './user-agent-parser';

export interface SessionInfo {
  id: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  country: string | null;
  ipAddress: string | null;
  lastActivityAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

/**
 * Create a new session record
 */
export async function createSession(
  prisma: PrismaClient,
  userId: string,
  token: string,
  ipAddress: string | null,
  userAgent: string | null,
  expiresAt: Date,
  city?: string | null,
  country?: string | null
): Promise<void> {
  const deviceInfo = parseUserAgent(userAgent);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      device: deviceInfo.device === 'Unknown' ? null : deviceInfo.device,
      browser: deviceInfo.browser === 'Unknown' ? null : deviceInfo.browser,
      os: deviceInfo.os === 'Unknown' ? null : deviceInfo.os,
      city: city || null,
      country: country || null,
      lastActivityAt: new Date(),
    },
  });
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(
  prisma: PrismaClient,
  token: string
): Promise<void> {
  await prisma.session.updateMany({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    data: {
      lastActivityAt: new Date(),
    },
  });
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(
  prisma: PrismaClient,
  userId: string,
  currentToken?: string
): Promise<SessionInfo[]> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastActivityAt: 'desc' },
  });

  return sessions.map((session) => ({
    id: session.id,
    device: session.device,
    browser: session.browser,
    os: session.os,
    city: session.city,
    country: session.country,
    ipAddress: session.ipAddress,
    lastActivityAt: session.lastActivityAt,
    createdAt: session.createdAt,
    isCurrent: currentToken ? session.token === currentToken : false,
  }));
}

/**
 * Terminate a specific session
 */
export async function terminateSession(
  prisma: PrismaClient,
  sessionId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.session.deleteMany({
    where: {
      id: sessionId,
      userId, // Ensure user can only delete their own sessions (unless admin)
    },
  });

  return result.count > 0;
}

/**
 * Terminate all sessions for a user except the current one
 */
export async function terminateAllOtherSessions(
  prisma: PrismaClient,
  userId: string,
  currentToken: string
): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      token: { not: currentToken },
    },
  });

  return result.count;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(prisma: PrismaClient): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}

