import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/permissions
 * List all permissions (admin only)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();
    const p: any = prisma;

    const permissions = await p.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }, { field: 'asc' }],
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

/**
 * POST /api/permissions
 * Create a new permission (admin only)
 */
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { resource, action, field, scope, description } = body;

    if (!resource || !action) {
      return NextResponse.json({ error: 'resource and action are required' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const p: any = prisma;

    const permission = await p.permission.create({
      data: {
        resource,
        action,
        field: field || null,
        scope: scope || 'own',
        description: description || null,
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create permission:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Permission already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 });
  }
}

