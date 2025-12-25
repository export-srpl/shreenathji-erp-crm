import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

/**
 * GET /api/win-loss-reasons
 * Returns win/loss reasons, optionally filtered by type and module
 * Query params:
 *   - type: 'win' | 'loss' | 'disqualify'
 *   - module: 'LEAD' | 'DEAL'
 *   - includeInactive: boolean (default: false)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const module = searchParams.get('module');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const prisma = await getPrismaClient();

    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (module) {
      where.module = module;
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    const reasons = await prisma.winLossReason.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(reasons);
  } catch (error) {
    console.error('Failed to fetch win/loss reasons:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch win/loss reasons',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/win-loss-reasons
 * Create a new win/loss reason (admin only)
 */
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, type, module, description, order, isActive } = body;

    if (!name || !type || !module) {
      return NextResponse.json(
        { error: 'Name, type, and module are required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    const reason = await prisma.winLossReason.create({
      data: {
        name,
        type,
        module,
        description: description || null,
        order: order ?? 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(reason, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A reason with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to create win/loss reason:', error);
    return NextResponse.json(
      {
        error: 'Failed to create win/loss reason',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

