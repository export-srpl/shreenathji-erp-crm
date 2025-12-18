import { getPrismaClient } from '@/lib/prisma';
import { getClientIP } from './rate-limit';

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'login_failed' 
  | 'password_change' 
  | 'password_reset_request'
  | 'password_reset'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_verified'
  | 'account_locked'
  | 'account_unlocked'
  | 'session_created'
  | 'session_expired'
  | 'unauthorized_access'
  | 'rate_limit_exceeded';

export type AuditResource = 
  | 'user' 
  | 'lead' 
  | 'customer' 
  | 'product' 
  | 'deal' 
  | 'quote' 
  | 'invoice' 
  | 'session' 
  | 'auth';

/**
 * Log an audit event
 */
export async function logAuditEvent(
  req: Request,
  action: AuditAction,
  resource: AuditResource,
  options: {
    userId?: string | null;
    resourceId?: string;
    details?: Record<string, any>;
  } = {}
): Promise<void> {
  try {
    const prisma = await getPrismaClient();
    const ipAddress = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await prisma.auditLog.create({
      data: {
        userId: options.userId || null,
        action,
        resource,
        resourceId: options.resourceId || null,
        details: options.details ? JSON.stringify(options.details) : null,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Don't throw - audit logging should never break the application
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100
) {
  const prisma = await getPrismaClient();
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

/**
 * Get audit logs for a resource
 */
export async function getResourceAuditLogs(
  resource: AuditResource,
  resourceId: string,
  limit: number = 100
) {
  const prisma = await getPrismaClient();
  return prisma.auditLog.findMany({
    where: { resource, resourceId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

