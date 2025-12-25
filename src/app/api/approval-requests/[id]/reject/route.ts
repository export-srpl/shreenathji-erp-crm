import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext } from '@/lib/auth';
import { canApprove, rejectRequest } from '@/lib/approval-workflow';
import { logAudit } from '@/lib/audit-logger';

type Params = {
  params: { id: string };
};

/**
 * POST /api/approval-requests/[id]/reject
 * Reject an approval request
 */
export async function POST(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { rejectionReason } = body;

    if (!rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    // Check if user can approve this request
    const canUserApprove = await canApprove(prisma, auth.userId, auth.role, params.id);
    if (!canUserApprove) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get IP and user agent for audit log
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      null;
    const userAgent = req.headers.get('user-agent') || null;

    await rejectRequest(prisma, params.id, auth.userId, rejectionReason);

    // Log audit entry
    await logAudit(prisma, {
      userId: auth.userId,
      action: 'approval_rejected',
      resource: 'approval_request',
      resourceId: params.id,
      details: { rejectionReason },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, status: 'rejected' });
  } catch (error) {
    console.error('Failed to reject request:', error);
    return NextResponse.json(
      {
        error: 'Failed to reject request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

