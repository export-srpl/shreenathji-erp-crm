import { getPrismaClient } from '@/lib/prisma';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if an account is locked
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  const prisma = await getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  });

  if (!user || !user.lockedUntil) {
    return false;
  }

  // Check if lockout has expired
  if (user.lockedUntil < new Date()) {
    // Unlock the account
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
    return false;
  }

  return true;
}

/**
 * Record a failed login attempt
 */
export async function recordFailedLoginAttempt(userId: string): Promise<{ locked: boolean; lockoutUntil?: Date }> {
  const prisma = await getPrismaClient();
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true, lockedUntil: true },
  });

  if (!user) {
    return { locked: false };
  }

  // If already locked, return lockout info
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { locked: true, lockoutUntil: user.lockedUntil };
  }

  const newAttempts = (user.failedLoginAttempts || 0) + 1;
  const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

  const updateData: {
    failedLoginAttempts: number;
    lockedUntil?: Date;
  } = {
    failedLoginAttempts: newAttempts,
  };

  if (shouldLock) {
    updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return {
    locked: shouldLock,
    lockoutUntil: shouldLock ? updateData.lockedUntil : undefined,
  };
}

/**
 * Reset failed login attempts (on successful login)
 */
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  const prisma = await getPrismaClient();
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

/**
 * Manually unlock an account (admin function)
 */
export async function unlockAccount(userId: string): Promise<void> {
  const prisma = await getPrismaClient();
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

