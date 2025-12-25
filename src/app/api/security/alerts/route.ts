import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

/**
 * GET /api/security/alerts
 * Get security alerts (admin only)
 * Query params:
 *   - severity: 'low' | 'medium' | 'high' | 'critical'
 *   - type: Alert type filter
 *   - acknowledged: 'true' | 'false'
 *   - limit: Number of alerts to return (default: 100)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const acknowledged = searchParams.get('acknowledged');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const prisma = await getPrismaClient();

    const where: any = {};
    if (severity) {
      where.severity = severity;
    }
    if (type) {
      where.type = type;
    }
    if (acknowledged !== null) {
      where.acknowledged = acknowledged === 'true';
    }

    const alerts = await prisma.securityAlert.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Failed to fetch security alerts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch security alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
