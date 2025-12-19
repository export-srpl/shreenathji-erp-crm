import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { id: string };
};

// GET /api/workflow-config/lead-stages/[id]
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const stage = await prisma.leadStage.findUnique({
    where: { id: params.id },
  });

  if (!stage) {
    return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
  }

  return NextResponse.json(stage);
}

// PATCH /api/workflow-config/lead-stages/[id]
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, order, stageType, color, isActive, mapTo } = body;

    const prisma = await getPrismaClient();

    const existing = await prisma.leadStage.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    // Check if stage is in use
    const leadsUsingStage = await prisma.lead.count({
      where: { status: existing.name },
    });

    // If renaming and stage is in use, require mapping
    if (name && name !== existing.name && leadsUsingStage > 0) {
      if (!mapTo) {
        return NextResponse.json(
          {
            error: `Stage "${existing.name}" is in use by ${leadsUsingStage} lead(s). Please map to another stage before renaming.`,
            leadCount: leadsUsingStage,
          },
          { status: 400 }
        );
      }

      // Map leads to new stage
      await prisma.lead.updateMany({
        where: { status: existing.name },
        data: { status: mapTo },
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (order !== undefined) updateData.order = order;
    if (stageType !== undefined) updateData.stageType = stageType;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.leadStage.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A stage with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to update lead stage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update lead stage' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow-config/lead-stages/[id]
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();

    const stage = await prisma.leadStage.findUnique({
      where: { id: params.id },
    });

    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    // Check if stage is in use
    const leadsUsingStage = await prisma.lead.count({
      where: { status: stage.name },
    });

    if (leadsUsingStage > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete stage. It is in use by ${leadsUsingStage} lead(s).`,
          leadCount: leadsUsingStage,
        },
        { status: 400 }
      );
    }

    await prisma.leadStage.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete lead stage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete lead stage' },
      { status: 500 }
    );
  }
}

