import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { getAlertThresholds } from '@/lib/alert-config';

/**
 * GET /api/security/thresholds
 * Get current alert thresholds (admin only)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const thresholds = getAlertThresholds();
    return NextResponse.json(thresholds);
  } catch (error) {
    console.error('Failed to fetch alert thresholds:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch alert thresholds',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

