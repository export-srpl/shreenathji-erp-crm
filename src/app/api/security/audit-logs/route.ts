import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { getAuditLogs } from '@/lib/audit-logger';
import { canViewAuditLogs } from '@/lib/permissions-enhanced';

/**
 * GET /api/security/audit-logs
 * Get audit logs (admin only)
 * Query params:
 *   - userId: Filter by user ID
 *   - resource: Filter by resource type
 *   - resourceId: Filter by resource ID
 *   - action: Filter by action
 *   - startDate: Start date (ISO string)
 *   - endDate: End date (ISO string)
 *   - limit: Number of logs to return (default: 100, max: 1000)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !canViewAuditLogs(auth)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const resourceId = searchParams.get('resourceId') || undefined;
    const action = searchParams.get('action') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);

    const prisma = await getPrismaClient();

    const logs = await getAuditLogs(prisma, {
      userId,
      resource,
      resourceId,
      action,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch audit logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

