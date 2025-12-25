import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext } from '@/lib/auth';

type Params = {
  params: { id: string };
};

/**
 * GET /api/saved-views/[id]
 * Get a specific saved view
 */
export async function GET(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = await getPrismaClient();
    const view = await prisma.savedView.findUnique({
      where: { id: params.id },
    });

    if (!view) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Ensure user can only access their own views
    if (view.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(view);
  } catch (error) {
    console.error('Failed to fetch saved view:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch saved view',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/saved-views/[id]
 * Update a saved view
 */
export async function PATCH(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const prisma = await getPrismaClient();

    // Verify view exists and belongs to user
    const existing = await prisma.savedView.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.filters !== undefined) {
      updateData.filters = typeof body.filters === 'string' ? body.filters : JSON.stringify(body.filters);
    }
    if (body.sortBy !== undefined) updateData.sortBy = body.sortBy;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.isDefault !== undefined) {
      updateData.isDefault = body.isDefault;
      // If setting as default, unset other defaults for this module and user
      if (body.isDefault) {
        await prisma.savedView.updateMany({
          where: {
            userId: auth.userId,
            module: existing.module,
            isDefault: true,
            id: { not: params.id },
          },
          data: {
            isDefault: false,
          },
        });
      }
    }

    const view = await prisma.savedView.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(view);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A view with this name already exists for this module' },
        { status: 409 }
      );
    }
    console.error('Failed to update saved view:', error);
    return NextResponse.json(
      {
        error: 'Failed to update saved view',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saved-views/[id]
 * Delete a saved view
 */
export async function DELETE(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = await getPrismaClient();

    // Verify view exists and belongs to user
    const existing = await prisma.savedView.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.savedView.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete saved view:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete saved view',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

