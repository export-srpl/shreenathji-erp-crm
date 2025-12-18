import { NextResponse } from 'next/server';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { getSecurityStats } from '@/lib/security-monitoring';

/**
 * GET /api/security/stats
 * Returns aggregated security metrics for use in an admin dashboard.
 */
export async function GET(req: Request) {
  const auth = await getAuthContext(req);

  // Only admins can view security stats
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const daysParam = url.searchParams.get('days');
    const days = daysParam ? Math.max(1, Math.min(90, Number(daysParam) || 7)) : 7;

    const stats = await getSecurityStats(days);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch security stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security stats' },
      { status: 500 }
    );
  }
}


