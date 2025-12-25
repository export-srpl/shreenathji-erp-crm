import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { checkAndRequestApproval, isPendingApproval } from '@/lib/approval-integration';
import { logAudit } from '@/lib/audit-logger';

type Params = {
  params: { id: string };
};

// GET /api/automation/rules/[id]
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const rule = await prisma.automationRule.findUnique({
    where: { id: params.id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  return NextResponse.json(rule);
}

// PATCH /api/automation/rules/[id] - update an automation rule (admin only)
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, module, triggerType, condition, actions, isActive } = body;

    const prisma = await getPrismaClient();

    const existing = await prisma.automationRule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Phase 4: Check if there's a pending approval request
    const pending = await isPendingApproval(prisma, 'workflow_rule', params.id, 'update');

    if (pending) {
      return NextResponse.json(
        {
          error: 'Pending approval required',
          message: 'This workflow rule has pending approval requests. Please wait for approval before making changes.',
        },
        { status: 403 }
      );
    }

    // Phase 4: Check if approval is required for workflow rule changes
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      null;
    const userAgent = req.headers.get('user-agent') || null;

    const approvalCheck = await checkAndRequestApproval(prisma, {
      resource: 'workflow_rule',
      resourceId: params.id,
      action: 'update',
      data: {
        name,
        module,
        triggerType,
        isActive,
      },
      userId: auth.userId || '',
      ipAddress: logIpAddress,
      userAgent: logUserAgent,
    });

    if (approvalCheck.requiresApproval) {
      if (approvalCheck.error) {
        return NextResponse.json(
          {
            error: approvalCheck.error,
            approvalRequestId: approvalCheck.approvalRequestId,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: 'Approval required',
          message: 'Workflow rule changes require approval before they can be applied.',
          approvalRequestId: approvalCheck.approvalRequestId,
          requiresApproval: true,
        },
        { status: 403 }
      );
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (module !== undefined) data.module = module;
    if (triggerType !== undefined) data.triggerType = triggerType;
    if (isActive !== undefined) data.isActive = isActive;
    if (condition !== undefined) {
      data.condition = condition ? (typeof condition === 'string' ? condition : JSON.stringify(condition)) : null;
    }
    if (actions !== undefined) {
      try {
        const parsed = typeof actions === 'string' ? JSON.parse(actions) : actions;
        if (!Array.isArray(parsed)) {
          return NextResponse.json(
            { error: 'actions must be a JSON array' },
            { status: 400 },
          );
        }
        data.actions = typeof actions === 'string' ? actions : JSON.stringify(actions);
      } catch {
        return NextResponse.json(
          { error: 'actions must be valid JSON' },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.automationRule.update({
      where: { id: params.id },
      data,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Phase 4: Log audit entry for workflow rule changes
    const logIpAddress = req.headers.get('x-forwarded-for') || 
                         req.headers.get('x-real-ip') || 
                         null;
    const logUserAgent = req.headers.get('user-agent') || null;

    await logAudit(prisma, {
      userId: auth.userId || null,
      action: 'workflow_rule_updated',
      resource: 'workflow_rule',
      resourceId: params.id,
      details: {
        ruleName: updated.name,
        module: updated.module,
        changes: {
          name: name !== undefined ? { old: existing.name, new: name } : undefined,
          isActive: isActive !== undefined ? { old: existing.isActive, new: isActive } : undefined,
          module: module !== undefined ? { old: existing.module, new: module } : undefined,
        },
      },
      ipAddress: logIpAddress,
      userAgent: logUserAgent,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update automation rule:', error);
    return NextResponse.json({ error: 'Failed to update automation rule' }, { status: 500 });
  }
}

// DELETE /api/automation/rules/[id] - delete an automation rule (admin only)
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();

    const existing = await prisma.automationRule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Phase 4: Check if there's a pending approval request
    const pending = await isPendingApproval(prisma, 'workflow_rule', params.id, 'delete');

    if (pending) {
      return NextResponse.json(
        {
          error: 'Pending approval required',
          message: 'This workflow rule deletion has pending approval requests. Please wait for approval before deleting.',
        },
        { status: 403 }
      );
    }

    // Phase 4: Check if approval is required for workflow rule deletion
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      null;
    const userAgent = req.headers.get('user-agent') || null;

    const approvalCheck = await checkAndRequestApproval(prisma, {
      resource: 'workflow_rule',
      resourceId: params.id,
      action: 'delete',
      data: {
        ruleName: existing.name,
        module: existing.module,
      },
      userId: auth.userId || '',
      ipAddress: logIpAddress,
      userAgent: logUserAgent,
    });

    if (approvalCheck.requiresApproval) {
      if (approvalCheck.error) {
        return NextResponse.json(
          {
            error: approvalCheck.error,
            approvalRequestId: approvalCheck.approvalRequestId,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: 'Approval required',
          message: 'Workflow rule deletion requires approval before it can be performed.',
          approvalRequestId: approvalCheck.approvalRequestId,
          requiresApproval: true,
        },
        { status: 403 }
      );
    }

    await prisma.automationRule.delete({
      where: { id: params.id },
    });

    // Phase 4: Log audit entry for workflow rule deletion
    await logAudit(prisma, {
      userId: auth.userId || null,
      action: 'workflow_rule_deleted',
      resource: 'workflow_rule',
      resourceId: params.id,
      details: {
        ruleName: existing.name,
        module: existing.module,
      },
      ipAddress: logIpAddress,
      userAgent: logUserAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete automation rule:', error);
    return NextResponse.json({ error: 'Failed to delete automation rule' }, { status: 500 });
  }
}


