import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

/**
 * DELETE /api/permissions/roles/[id]
 * Remove a permission from a role (admin only)
 */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();
    const p: any = prisma;

    await p.rolePermission.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove role permission:', error);
    return NextResponse.json({ error: 'Failed to remove role permission' }, { status: 500 });
  }
}

