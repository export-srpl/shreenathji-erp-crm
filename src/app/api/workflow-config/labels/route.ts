import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/workflow-config/labels
export async function GET(_req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const labels = await prisma.label.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(labels);
}

// POST /api/workflow-config/labels
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, color, description, isActive } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }

    // Validate color format (hex)
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color code (e.g., #FF5733)' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    const label = await prisma.label.create({
      data: {
        name,
        color,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A label with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to create label:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create label' },
      { status: 500 }
    );
  }
}

