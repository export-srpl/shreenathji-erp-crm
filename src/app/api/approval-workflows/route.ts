import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

/**
 * GET /api/approval-workflows
 * List all approval workflows (admin only)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const workflows = await prisma.approvalWorkflow.findMany({
      where,
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error('Failed to fetch approval workflows:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch approval workflows',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approval-workflows
 * Create a new approval workflow (admin only)
 */
export async function POST(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      description,
      resource,
      action,
      thresholdValue,
      thresholdField,
      requiresApproval,
      approverRoles,
      approverUserIds,
      isActive,
    } = body;

    if (!name || !resource || !action) {
      return NextResponse.json(
        { error: 'Name, resource, and action are required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        name,
        description: description || null,
        resource,
        action,
        thresholdValue: thresholdValue !== undefined ? thresholdValue : null,
        thresholdField: thresholdField || null,
        requiresApproval: requiresApproval !== undefined ? requiresApproval : true,
        approverRoles: approverRoles || [],
        approverUserIds: approverUserIds || [],
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create approval workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to create approval workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

