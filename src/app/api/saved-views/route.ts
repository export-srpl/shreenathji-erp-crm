import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext } from '@/lib/auth';

/**
 * GET /api/saved-views
 * Returns saved views for the current user, optionally filtered by module
 * Query params:
 *   - module: 'LEAD' | 'DEAL' | 'CUSTOMER' | etc.
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const module = searchParams.get('module');

    const prisma = await getPrismaClient();

    const where: any = {
      userId: auth.userId,
    };
    if (module) {
      where.module = module;
    }

    const views = await prisma.savedView.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(views);
  } catch (error) {
    console.error('Failed to fetch saved views:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch saved views',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved-views
 * Create a new saved view for the current user
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
    const { name, module, filters, sortBy, sortOrder, isDefault } = body;

    if (!name || !module || !filters) {
      return NextResponse.json(
        { error: 'Name, module, and filters are required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    // If setting as default, unset other defaults for this module and user
    if (isDefault) {
      await prisma.savedView.updateMany({
        where: {
          userId: auth.userId,
          module,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const view = await prisma.savedView.create({
      data: {
        userId: auth.userId,
        name,
        module,
        filters: typeof filters === 'string' ? filters : JSON.stringify(filters),
        sortBy: sortBy || null,
        sortOrder: sortOrder || null,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(view, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A view with this name already exists for this module' },
        { status: 409 }
      );
    }
    console.error('Failed to create saved view:', error);
    return NextResponse.json(
      {
        error: 'Failed to create saved view',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

