import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext } from '@/lib/auth';
import { getPendingApprovals } from '@/lib/approval-workflow';

/**
 * GET /api/approval-requests/count
 * Get count of pending approvals for current user
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = await getPrismaClient();

    // Get pending approvals the user can approve
    const pending = await getPendingApprovals(prisma, auth.userId, auth.role);

    return NextResponse.json({ count: pending.length });
  } catch (error) {
    console.error('Failed to fetch approval count:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch approval count',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

