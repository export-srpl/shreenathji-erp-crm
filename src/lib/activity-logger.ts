import type { PrismaClient } from '@prisma/client';

type ActivityModule = 'LEAD' | 'DEAL' | 'CUST' | 'PROD' | 'QUOTE' | 'SO' | 'INV' | 'TASK' | 'ACTIVITY';

export interface LogActivityOptions {
  prisma: PrismaClient;
  module: ActivityModule;
  entityType: string;
  entityId: string;
  srplId?: string | null;
  action: string;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  description?: string;
  metadata?: Record<string, unknown>;
  performedById?: string | null;
}

/**
 * Writes an immutable activity entry to the unified timeline.
 * Failures are logged but do NOT block the main request flow.
 */
export async function logActivity({
  prisma,
  module,
  entityType,
  entityId,
  srplId,
  action,
  field,
  oldValue,
  newValue,
  description,
  metadata,
  performedById,
}: LogActivityOptions): Promise<void> {
  try {
    const p: any = prisma;

    await p.activity.create({
      data: {
        module,
        entityType,
        entityId,
        srplId: srplId || null,
        action,
        field: field || null,
        oldValue: serializeValue(oldValue),
        newValue: serializeValue(newValue),
        description: description || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        performedById: performedById || null,
      },
    });
  } catch (error) {
    // Do NOT throw – timeline is best-effort, never breaks primary workflow
    console.error('Failed to log activity', {
      error,
      module,
      entityType,
      entityId,
      action,
      field,
    });
  }
}

function serializeValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}


