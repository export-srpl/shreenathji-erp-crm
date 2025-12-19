import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { id: string };
};

// GET /api/workflow-config/labels/[id]
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const label = await prisma.label.findUnique({
    where: { id: params.id },
  });

  if (!label) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  return NextResponse.json(label);
}

// PATCH /api/workflow-config/labels/[id]
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, color, description, isActive } = body;

    const prisma = await getPrismaClient();

    const existing = await prisma.label.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color code (e.g., #FF5733)' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.label.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A label with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to update label:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update label' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow-config/labels/[id]
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();

    await prisma.label.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete label:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete label' },
      { status: 500 }
    );
  }
}

