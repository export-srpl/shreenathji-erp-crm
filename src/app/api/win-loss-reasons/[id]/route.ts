import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

/**
 * GET /api/win-loss-reasons/[id]
 * Get a specific win/loss reason
 */
export async function GET(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const prisma = await getPrismaClient();
    const reason = await prisma.winLossReason.findUnique({
      where: { id: params.id },
    });

    if (!reason) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(reason);
  } catch (error) {
    console.error('Failed to fetch win/loss reason:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch win/loss reason',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/win-loss-reasons/[id]
 * Update a win/loss reason (admin only)
 */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const prisma = await getPrismaClient();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.module !== undefined) updateData.module = body.module;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const reason = await prisma.winLossReason.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(reason);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A reason with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to update win/loss reason:', error);
    return NextResponse.json(
      {
        error: 'Failed to update win/loss reason',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/win-loss-reasons/[id]
 * Delete a win/loss reason (admin only)
 * Note: This will set isActive to false rather than deleting, to preserve historical data
 */
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();

    // Soft delete by setting isActive to false
    const reason = await prisma.winLossReason.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json(reason);
  } catch (error) {
    console.error('Failed to delete win/loss reason:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete win/loss reason',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

