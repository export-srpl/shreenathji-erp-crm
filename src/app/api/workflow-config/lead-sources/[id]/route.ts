import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { id: string };
};

// GET /api/workflow-config/lead-sources/[id]
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const source = await prisma.leadSource.findUnique({
    where: { id: params.id },
  });

  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  return NextResponse.json(source);
}

// PATCH /api/workflow-config/lead-sources/[id]
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, isActive, mapTo } = body;

    const prisma = await getPrismaClient();

    const existing = await prisma.leadSource.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Check if source is in use
    const leadsUsingSource = await prisma.lead.count({
      where: { source: existing.name },
    });

    // If renaming and source is in use, require mapping
    if (name && name !== existing.name && leadsUsingSource > 0) {
      if (!mapTo) {
        return NextResponse.json(
          {
            error: `Source "${existing.name}" is in use by ${leadsUsingSource} lead(s). Please map to another source before renaming.`,
            leadCount: leadsUsingSource,
          },
          { status: 400 }
        );
      }

      // Map leads to new source
      await prisma.lead.updateMany({
        where: { source: existing.name },
        data: { source: mapTo },
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.leadSource.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A source with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to update lead source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update lead source' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow-config/lead-sources/[id]
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();

    const source = await prisma.leadSource.findUnique({
      where: { id: params.id },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Check if source is in use
    const leadsUsingSource = await prisma.lead.count({
      where: { source: source.name },
    });

    if (leadsUsingSource > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete source. It is in use by ${leadsUsingSource} lead(s).`,
          leadCount: leadsUsingSource,
        },
        { status: 400 }
      );
    }

    await prisma.leadSource.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete lead source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete lead source' },
      { status: 500 }
    );
  }
}

