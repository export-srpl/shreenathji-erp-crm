import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext } from '@/lib/auth';
import { canApprove, approveRequest } from '@/lib/approval-workflow';
import { logAudit } from '@/lib/audit-logger';
import { executeApprovedAction } from '@/lib/approval-executor';

type Params = {
  params: { id: string };
};

/**
 * POST /api/approval-requests/[id]/approve
 * Approve an approval request
 */
export async function POST(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // First mark as approved
    await approveRequest(prisma, params.id, auth.userId);

    // Execute the approved action
    const executionResult = await executeApprovedAction(prisma, params.id);

    // Log audit entry
    await logAudit(prisma, {
      userId: auth.userId,
      action: 'approval_approved',
      resource: 'approval_request',
      resourceId: params.id,
      details: {
        executionSuccess: executionResult.success,
        executionError: executionResult.error,
      },
      ipAddress,
      userAgent,
    });

    if (!executionResult.success) {
      // Approval was recorded but execution failed
      return NextResponse.json(
        {
          success: true,
          status: 'approved',
          warning: 'Approval recorded but action execution failed',
          executionError: executionResult.error,
        },
        { status: 207 } // 207 Multi-Status
      );
    }

    return NextResponse.json({
      success: true,
      status: 'approved',
      executed: true,
      executionResult: executionResult.data,
    });
  } catch (error) {
    console.error('Failed to approve request:', error);
    return NextResponse.json(
      {
        error: 'Failed to approve request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

