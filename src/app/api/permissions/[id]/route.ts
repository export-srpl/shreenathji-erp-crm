import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { id: string };
};

/**
 * GET /api/permissions/[id]
 * Get a single permission (admin only)
 */
export async function GET(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();
    const p: any = prisma;

    const permission = await p.permission.findUnique({
      where: { id: params.id },
    });

    if (!permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Failed to fetch permission:', error);
    return NextResponse.json({ error: 'Failed to fetch permission' }, { status: 500 });
  }
}

/**
 * DELETE /api/permissions/[id]
 * Delete a permission (admin only)
 */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();
    const p: any = prisma;

    await p.permission.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete permission:', error);
    return NextResponse.json({ error: 'Failed to delete permission' }, { status: 500 });
  }
}

