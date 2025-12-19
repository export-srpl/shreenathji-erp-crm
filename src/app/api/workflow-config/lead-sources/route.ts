import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/workflow-config/lead-sources
export async function GET(_req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const sources = await prisma.leadSource.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // Count leads per source
  const sourcesWithCounts = await Promise.all(
    sources.map(async (source) => {
      const count = await prisma.lead.count({
        where: { source: source.name },
      });
      return { ...source, _count: { leads: count } };
    })
  );

  return NextResponse.json(sourcesWithCounts);
}

// POST /api/workflow-config/lead-sources
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    const source = await prisma.leadSource.create({
      data: {
        name,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A source with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to create lead source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lead source' },
      { status: 500 }
    );
  }
}

