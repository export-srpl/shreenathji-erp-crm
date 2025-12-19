import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { getFieldPermissions, hasPermission } from '@/lib/rbac';

/**
 * GET /api/auth/permissions
 * Returns current user's permissions summary for UI
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const prisma = await getPrismaClient();

    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get permissions for common resources
    const resources: Array<'lead' | 'deal' | 'customer' | 'product' | 'quote' | 'invoice'> = [
      'lead',
      'deal',
      'customer',
      'product',
      'quote',
      'invoice',
    ];

    const permissions: Record<string, any> = {
      role: auth.role,
      resources: {},
    };

    for (const resource of resources) {
      const [canView, canCreate, canUpdate, canDelete, fieldPerms] = await Promise.all([
        hasPermission(prisma, auth, resource, 'view', 'own'),
        hasPermission(prisma, auth, resource, 'create', 'own'),
        hasPermission(prisma, auth, resource, 'update', 'own'),
        hasPermission(prisma, auth, resource, 'delete', 'own'),
        getFieldPermissions(prisma, auth, resource),
      ]);

      permissions.resources[resource] = {
        canView,
        canCreate,
        canUpdate,
        canDelete,
        fields: Object.fromEntries(fieldPerms),
      };
    }

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Failed to fetch user permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

