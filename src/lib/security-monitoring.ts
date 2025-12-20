import { getPrismaClient } from '@/lib/prisma';
import { logAuditEvent, AuditAction } from './audit-log';

/**
 * Security monitoring and alerting utilities
 */

export interface SecurityAlert {
  type: 'suspicious_activity' | 'multiple_failed_logins' | 'unusual_access' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  ipAddress?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(userId: string, ipAddress: string): Promise<SecurityAlert[]> {
  const prisma = await getPrismaClient();
  const alerts: SecurityAlert[] = [];

  // Check for multiple failed login attempts
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true, lockedUntil: true },
  });

  if (user && user.failedLoginAttempts && user.failedLoginAttempts >= 3) {
    alerts.push({
      type: 'multiple_failed_logins',
      severity: user.failedLoginAttempts >= 5 ? 'high' : 'medium',
      message: `User has ${user.failedLoginAttempts} failed login attempts`,
      userId,
      ipAddress,
      timestamp: new Date(),
      details: { failedAttempts: user.failedLoginAttempts },
    });
  }

  // Check for unusual IP addresses (different from last successful login)
  // Optimized: Only fetch the most recent login, not 5
  const recentLogin = await prisma.auditLog.findFirst({
    where: {
      userId,
      action: 'login',
    },
    orderBy: { timestamp: 'desc' },
    select: { ipAddress: true },
  });

  if (recentLogin && recentLogin.ipAddress) {
    const lastLoginIP = recentLogin.ipAddress;
    if (lastLoginIP !== ipAddress && lastLoginIP !== 'unknown') {
      alerts.push({
        type: 'unusual_access',
        severity: 'medium',
        message: `Login from new IP address: ${ipAddress} (previous: ${lastLoginIP})`,
        userId,
        ipAddress,
        timestamp: new Date(),
        details: { previousIP: lastLoginIP },
      });
    }
  }

  return alerts;
}

/**
 * Log security alert
 */
export async function logSecurityAlert(alert: SecurityAlert): Promise<void> {
  await logAuditEvent(
    {} as Request, // We'll need to pass the actual request in real usage
    alert.type as AuditAction,
    'auth',
    {
      userId: alert.userId || undefined,
      details: {
        severity: alert.severity,
        message: alert.message,
        ipAddress: alert.ipAddress,
        ...alert.details,
      },
    }
  );

  // In production, you would also:
  // - Send email alerts for high/critical severity
  // - Send to SIEM system
  // - Trigger incident response procedures
  console.warn('SECURITY ALERT:', alert);
}

/**
 * Get security statistics
 */
export async function getSecurityStats(days: number = 7) {
  const prisma = await getPrismaClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalLogins,
    failedLogins,
    lockedAccounts,
    suspiciousActivity,
  ] = await Promise.all([
    prisma.auditLog.count({
      where: {
        action: 'login',
        timestamp: { gte: since },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: 'login_failed',
        timestamp: { gte: since },
      },
    }),
    prisma.user.count({
      where: {
        lockedUntil: { gt: new Date() },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: 'unauthorized_access',
        timestamp: { gte: since },
      },
    }),
  ]);

  return {
    period: `${days} days`,
    totalLogins,
    failedLogins,
    successRate: totalLogins > 0 ? ((totalLogins - failedLogins) / totalLogins * 100).toFixed(2) : '0',
    lockedAccounts,
    suspiciousActivity,
    timestamp: new Date(),
  };
}

