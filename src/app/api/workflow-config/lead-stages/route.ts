import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/workflow-config/lead-stages
export async function GET(_req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const stages = await prisma.leadStage.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: {
          // We'll count leads manually since we don't have direct relation
        },
      },
    },
  });

  // Count leads per stage
  const stagesWithCounts = await Promise.all(
    stages.map(async (stage) => {
      const count = await prisma.lead.count({
        where: { status: stage.name },
      });
      return { ...stage, _count: { leads: count } };
    })
  );

  return NextResponse.json(stagesWithCounts);
}

// POST /api/workflow-config/lead-stages
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, order, stageType, color, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    // Get max order if not provided
    const maxOrder = order !== undefined ? order : await prisma.leadStage.aggregate({
      _max: { order: true },
    }).then(r => (r._max.order || 0) + 1);

    const stage = await prisma.leadStage.create({
      data: {
        name,
        order: maxOrder,
        stageType: stageType || 'active',
        color: color || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A stage with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to create lead stage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lead stage' },
      { status: 500 }
    );
  }
}

