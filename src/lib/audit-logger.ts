import type { PrismaClient } from '@prisma/client';

export interface AuditLogEntry {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Create an immutable audit log entry
 * 
 * Phase 4: This function ensures audit logs are created but never updated or deleted.
 * The database constraints should prevent updates/deletes, but we also enforce this in code.
 */
export async function logAudit(prisma: PrismaClient, entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId || null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Best-effort logging - don't block main workflow
    // But log errors for monitoring
    console.error('Failed to create audit log entry:', {
      error,
      entry,
    });
  }
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(
  prisma: PrismaClient,
  filters: {
    userId?: string;
    resource?: string;
    resourceId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  const where: any = {};

  if (filters.userId) {
    where.userId = filters.userId;
  }
  if (filters.resource) {
    where.resource = filters.resource;
  }
  if (filters.resourceId) {
    where.resourceId = filters.resourceId;
  }
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) {
      where.timestamp.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.timestamp.lte = filters.endDate;
    }
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: filters.limit || 100,
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
}

