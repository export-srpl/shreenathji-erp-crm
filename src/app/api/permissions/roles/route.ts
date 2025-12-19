import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/permissions/roles
 * List all role-permission mappings (admin only)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    const prisma = await getPrismaClient();
    const p: any = prisma;

    const where: any = {};
    if (role) {
      where.role = role;
    }

    const rolePermissions = await p.rolePermission.findMany({
      where,
      include: {
        permission: true,
      },
      orderBy: [{ role: 'asc' }, { permission: { resource: 'asc' } }],
    });

    return NextResponse.json(rolePermissions);
  } catch (error) {
    console.error('Failed to fetch role permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch role permissions' }, { status: 500 });
  }
}

/**
 * POST /api/permissions/roles
 * Assign a permission to a role (admin only)
 */
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { role, permissionId, userId } = body;

    if (!role || !permissionId) {
      return NextResponse.json({ error: 'role and permissionId are required' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const p: any = prisma;

    const rolePermission = await p.rolePermission.create({
      data: {
        role,
        permissionId,
        userId: userId || null,
      },
      include: {
        permission: true,
      },
    });

    return NextResponse.json(rolePermission, { status: 201 });
  } catch (error: any) {
    console.error('Failed to assign role permission:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Role permission already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to assign role permission' }, { status: 500 });
  }
}

