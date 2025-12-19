import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { id: string };
};

// GET /api/workflow-config/deal-pipelines/[id]
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const pipeline = await prisma.dealPipeline.findUnique({
    where: { id: params.id },
    include: {
      stages: {
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { deals: true },
      },
    },
  });

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  }

  return NextResponse.json(pipeline);
}

// PATCH /api/workflow-config/deal-pipelines/[id]
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, isDefault, isActive, stages, mapStageTo } = body;

    const prisma = await getPrismaClient();

    // Check if pipeline exists
    const existing = await prisma.dealPipeline.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { deals: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.dealPipeline.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Update pipeline
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update stages if provided
    if (stages && Array.isArray(stages)) {
      // Get existing stages
      const existingStages = await prisma.pipelineStage.findMany({
        where: { pipelineId: params.id },
        include: {
          _count: {
            select: {
              // We'll check deals using the stage name since we don't have direct relation
            },
          },
        },
      });

      // Check if any stages are in use (by checking deals with matching stage names)
      for (const oldStage of existingStages) {
        const stageInUse = await prisma.deal.findFirst({
          where: {
            pipelineId: params.id,
            stage: oldStage.name,
          },
        });

        // If stage is in use and not in new stages, require mapping
        if (stageInUse && !stages.find((s: any) => s.id === oldStage.id)) {
          if (!mapStageTo || !mapStageTo[oldStage.id]) {
            return NextResponse.json(
              {
                error: `Stage "${oldStage.name}" is in use. Please map it to another stage before deletion.`,
                stageId: oldStage.id,
                stageName: oldStage.name,
              },
              { status: 400 }
            );
          }
        }
      }

      // Map deals to new stages if needed
      if (mapStageTo) {
        for (const [oldStageId, newStageName] of Object.entries(mapStageTo)) {
          await prisma.deal.updateMany({
            where: {
              pipelineId: params.id,
              stage: existingStages.find(s => s.id === oldStageId)?.name,
            },
            data: {
              stage: newStageName as string,
            },
          });
        }
      }

      // Delete old stages
      await prisma.pipelineStage.deleteMany({
        where: { pipelineId: params.id },
      });

      // Create new stages
      await prisma.pipelineStage.createMany({
        data: stages.map((stage: any, index: number) => ({
          pipelineId: params.id,
          name: stage.name,
          order: stage.order ?? index,
          stageType: stage.stageType || 'open',
          isMandatory: stage.isMandatory || false,
          isTerminal: stage.isTerminal || false,
          color: stage.color || null,
        })),
      });
    }

    const updated = await prisma.dealPipeline.update({
      where: { id: params.id },
      data: updateData,
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Failed to update pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pipeline' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow-config/deal-pipelines/[id]
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();

    // Check if pipeline is in use
    const pipeline = await prisma.dealPipeline.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { deals: true } },
      },
    });

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    if (pipeline.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default pipeline' },
        { status: 400 }
      );
    }

    if (pipeline._count.deals > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete pipeline. It is in use by ${pipeline._count.deals} deal(s).`,
          dealCount: pipeline._count.deals,
        },
        { status: 400 }
      );
    }

    await prisma.dealPipeline.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete pipeline' },
      { status: 500 }
    );
  }
}

