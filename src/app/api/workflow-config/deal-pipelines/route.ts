import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/workflow-config/deal-pipelines - list all pipelines
export async function GET(_req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const pipelines = await prisma.dealPipeline.findMany({
    include: {
      stages: {
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { deals: true },
      },
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  return NextResponse.json(pipelines);
}

// POST /api/workflow-config/deal-pipelines - create a new pipeline
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, isDefault, isActive, stages } = body;

    if (!name || !stages || !Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one stage are required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.dealPipeline.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const pipeline = await prisma.dealPipeline.create({
      data: {
        name,
        description: description || null,
        isDefault: isDefault || false,
        isActive: isActive !== undefined ? isActive : true,
        stages: {
          create: stages.map((stage: any, index: number) => ({
            name: stage.name,
            order: stage.order ?? index,
            stageType: stage.stageType || 'open',
            isMandatory: stage.isMandatory || false,
            isTerminal: stage.isTerminal || false,
            color: stage.color || null,
          })),
        },
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(pipeline, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pipeline' },
      { status: 500 }
    );
  }
}

