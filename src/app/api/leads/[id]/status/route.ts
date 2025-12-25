import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { trackStageChange } from '@/lib/lead-aging';
import { updateLeadScore } from '@/lib/lead-scoring';

type Params = {
  params: { id: string };
};

export async function POST(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;
  const body = await req.json();
  const { status, winLossReasonId, statusId } = body as {
    status: string;
    winLossReasonId?: string;
    statusId?: string;
  };

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 });
  }

  // Phase 2: Require win/loss reason for Won, Lost, or Disqualified statuses
  const requiresReason = ['Won', 'Lost', 'Converted', 'Disqualified'].includes(status);
  if (requiresReason && !winLossReasonId) {
    return NextResponse.json(
      {
        error: 'Win/Loss reason is required',
        message: `A reason is required when marking a lead as ${status}`,
      },
      { status: 400 }
    );
  }

  try {
    const prisma = await getPrismaClient();
    
    // Get existing lead for logging
    const existing = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const updateData: any = {
      status,
      lastActivityDate: new Date(),
    };

    if (statusId) {
      updateData.statusId = statusId;
    }

    // Set win/loss reason and timestamp if provided
    if (requiresReason && winLossReasonId) {
      updateData.winLossReasonId = winLossReasonId;
      updateData.wonLostAt = new Date();
    } else if (!requiresReason) {
      // Clear win/loss reason if status changed away from won/lost/disqualified
      updateData.winLossReasonId = null;
      updateData.wonLostAt = null;
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    // Track stage change for aging
    await trackStageChange(prisma, id, statusId || null, status);

    // Update lead score
    await updateLeadScore(prisma, id);

    // Log activity
    await logActivity({
      prisma,
      module: 'LEAD',
      entityType: 'lead',
      entityId: id,
      srplId: updated.srplId || undefined,
      action: 'stage_change',
      field: 'status',
      oldValue: existing.status,
      newValue: status,
      description: `Lead status changed from "${existing.status}" to "${status}"${winLossReasonId ? ` (Reason: ${winLossReasonId})` : ''}`,
      metadata: {
        winLossReasonId: winLossReasonId || null,
      },
      performedById: auth.userId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}


