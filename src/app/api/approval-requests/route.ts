import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext } from '@/lib/auth';
import { getPendingApprovals } from '@/lib/approval-workflow';

/**
 * GET /api/approval-requests
 * Get approval requests
 * Query params:
 *   - status: 'pending' | 'approved' | 'rejected'
 *   - resource: Filter by resource type
 *   - myRequests: 'true' to get only requests created by current user
 *   - myApprovals: 'true' to get only requests pending approval by current user
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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const resource = searchParams.get('resource');
    const myRequests = searchParams.get('myRequests') === 'true';
    const myApprovals = searchParams.get('myApprovals') === 'true';

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (resource) {
      where.resource = resource;
    }

    if (myRequests) {
      where.requestedById = auth.userId;
    }

    // If requesting my approvals, filter to pending requests I can approve
    if (myApprovals) {
      const pending = await getPendingApprovals(prisma, auth.userId, auth.role);
      const pendingIds = pending.map((p) => p.id);
      if (pendingIds.length === 0) {
        // Return empty array if no pending approvals
        return NextResponse.json([]);
      }
      where.id = { in: pendingIds };
      where.status = 'pending';
    }

    const requests = await prisma.approvalRequest.findMany({
      where,
      include: {
        workflow: true,
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Failed to fetch approval requests:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch approval requests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approval-requests
 * Create a new approval request
 */
export async function POST(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workflowId, resource, resourceId, action, reason, metadata } = body;

    if (!resource || !resourceId || !action) {
      return NextResponse.json(
        { error: 'Resource, resourceId, and action are required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    // Check if there's already a pending request for this resource/action
    const existing = await prisma.approvalRequest.findFirst({
      where: {
        resource,
        resourceId,
        action,
        status: 'pending',
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An approval request for this action is already pending' },
        { status: 409 }
      );
    }

    const request = await prisma.approvalRequest.create({
      data: {
        workflowId: workflowId || null,
        resource,
        resourceId,
        action,
        status: 'pending',
        requestedById: auth.userId,
        reason: reason || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        workflow: true,
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error('Failed to create approval request:', error);
    return NextResponse.json(
      {
        error: 'Failed to create approval request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

