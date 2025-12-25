import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

/**
 * GET /api/approval-workflows/[id]
 * Get a specific approval workflow
 */
export async function GET(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id: params.id },
      include: {
        requests: {
          take: 10,
          orderBy: { requestedAt: 'desc' },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Failed to fetch approval workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch approval workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/approval-workflows/[id]
 * Update an approval workflow (admin only)
 */
export async function PATCH(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const prisma = await getPrismaClient();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.resource !== undefined) updateData.resource = body.resource;
    if (body.action !== undefined) updateData.action = body.action;
    if (body.thresholdValue !== undefined) updateData.thresholdValue = body.thresholdValue;
    if (body.thresholdField !== undefined) updateData.thresholdField = body.thresholdField;
    if (body.requiresApproval !== undefined) updateData.requiresApproval = body.requiresApproval;
    if (body.approverRoles !== undefined) updateData.approverRoles = body.approverRoles;
    if (body.approverUserIds !== undefined) updateData.approverUserIds = body.approverUserIds;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const workflow = await prisma.approvalWorkflow.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Failed to update approval workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to update approval workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/approval-workflows/[id]
 * Delete an approval workflow (admin only)
 * Note: This sets isActive to false rather than deleting, to preserve historical data
 */
export async function DELETE(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();

    // Soft delete by setting isActive to false
    const workflow = await prisma.approvalWorkflow.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Failed to delete approval workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete approval workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

