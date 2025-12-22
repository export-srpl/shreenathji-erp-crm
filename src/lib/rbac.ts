import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from './auth';

export type PermissionScope = 'own' | 'team' | 'all';
export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'view_all' | 'edit_all';
export type PermissionResource = 'lead' | 'deal' | 'customer' | 'product' | 'quote' | 'invoice' | 'sales_order' | 'proforma_invoice';

export interface FieldPermission {
  field: string;
  view: boolean;
  edit: boolean;
}

/**
 * RBAC utility: Check if user has permission for a resource/action
 */
export async function hasPermission(
  prisma: PrismaClient,
  auth: AuthContext,
  resource: PermissionResource,
  action: PermissionAction,
  scope: PermissionScope = 'own',
): Promise<boolean> {
  if (!auth.userId) return false;

  // Admin always has all permissions
  if (auth.role === 'admin') return true;

  const p: any = prisma;

  // For users with salesScope, check permissions based on their sales scope role
  // Map salesScope to role for permission checking
  let permissionRole = auth.role;
  if (auth.salesScope === 'export_sales') {
    permissionRole = 'export_sales';
  } else if (auth.salesScope === 'domestic_sales') {
    permissionRole = 'domestic_sales';
  }

  // Check role-based permissions
  const rolePerm = await p.rolePermission.findFirst({
    where: {
      role: permissionRole,
      permission: {
        resource,
        action,
        scope: { in: [scope, 'all'] }, // 'all' scope grants access to all scopes
      },
    },
  });

  if (rolePerm) return true;

  // Check user-specific permissions (if any)
  const userPerm = await p.rolePermission.findFirst({
    where: {
      userId: auth.userId,
      permission: {
        resource,
        action,
        scope: { in: [scope, 'all'] },
      },
    },
  });

  return !!userPerm;
}

/**
 * RBAC utility: Get field-level permissions for a resource
 */
export async function getFieldPermissions(
  prisma: PrismaClient,
  auth: AuthContext,
  resource: PermissionResource,
): Promise<Map<string, FieldPermission>> {
  const fieldPerms = new Map<string, FieldPermission>();

  if (!auth.userId) return fieldPerms;

  // Admin can view and edit all fields
  if (auth.role === 'admin') {
    // Return empty map = no restrictions (all fields allowed)
    return fieldPerms;
  }

  const p: any = prisma;

  // Get all field-level permissions for this resource and role
  const permissions = await p.rolePermission.findMany({
    where: {
      OR: [
        { role: auth.role },
        { userId: auth.userId },
      ],
      permission: {
        resource,
        field: { not: null },
      },
    },
    include: {
      permission: true,
    },
  });

  for (const rp of permissions) {
    const perm = rp.permission;
    if (!perm.field) continue;

    const action = perm.action;
    const canView = action === 'view' || action === 'view_all' || action === 'edit_all';
    const canEdit = action === 'edit_all' || action === 'update';

    fieldPerms.set(perm.field, {
      field: perm.field,
      view: canView,
      edit: canEdit,
    });
  }

  return fieldPerms;
}

/**
 * RBAC utility: Apply record-level visibility filter based on scope and sales scope
 * Returns a Prisma where clause that filters records by owner/team and country
 */
export async function getVisibilityFilter(
  prisma: PrismaClient,
  auth: AuthContext,
  resource: PermissionResource,
  scope: PermissionScope = 'own',
): Promise<any> {
  try {
    if (!auth.userId) {
      // No access if not authenticated
      return { id: 'impossible-id-that-will-never-match' };
    }

    // Admin can see all (no filtering)
    if (auth.role === 'admin') {
      return {};
    }

    // Get user's sales scope for country-based filtering
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, salesScope: true, managerId: true },
      });
    } catch (error: any) {
      console.error('Error fetching user for visibility filter:', error);
      console.error('User fetch error details:', error.message, error.stack);
      // Return empty filter on error (allow access, but log the issue)
      return {};
    }

    if (!user) {
      console.warn(`User not found for userId: ${auth.userId}`);
      return {};
    }

    // Build country filter based on sales scope
    let countryFilter: any = {};
    if (user.salesScope === 'domestic_sales') {
      // Domestic sales users only see India records
      countryFilter = { country: 'India' };
    } else if (user.salesScope === 'export_sales') {
      // Export sales users only see non-India records
      countryFilter = { country: { not: 'India' } };
    }
    // If no salesScope, no country filtering (backward compatibility)

    // For 'all' scope, only apply country filtering (no ownership filtering)
    if (scope === 'all') {
      return countryFilter;
    }
  } catch (error: any) {
    console.error('Unexpected error in getVisibilityFilter:', error);
    console.error('getVisibilityFilter error stack:', error.stack);
    // Return empty filter on unexpected error (fail open for now, but log)
    return {};
  }

  // Get user's manager and team members for 'team' scope
  if (scope === 'team') {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, managerId: true },
    });

    if (!user) return { id: 'impossible-id-that-will-never-match' };

    // Get all team members (users with same manager, or user's direct reports)
    const teamMemberIds = await prisma.user.findMany({
      where: {
        OR: [
          { managerId: user.managerId }, // Same manager
          { managerId: auth.userId }, // Direct reports
          { id: auth.userId }, // Self
        ],
      },
      select: { id: true },
    }).then((users) => users.map((u) => u.id));

    // Apply filter based on resource type
    switch (resource) {
      case 'lead':
        return { 
          ownerId: { in: teamMemberIds },
          ...countryFilter,
        };
      case 'deal':
        // Filter deals via customer's country
        if (Object.keys(countryFilter).length > 0) {
          return {
            customer: {
              ...countryFilter,
            },
          };
        }
        return {};
      case 'customer':
        return countryFilter;
      case 'quote':
        return { 
          salesRepId: { in: teamMemberIds },
          ...(Object.keys(countryFilter).length > 0 ? {
            customer: countryFilter,
          } : {}),
        };
      case 'sales_order':
        return { 
          salesRepId: { in: teamMemberIds },
          ...(Object.keys(countryFilter).length > 0 ? {
            customer: countryFilter,
          } : {}),
        };
      case 'invoice':
        // Invoice might not have direct salesRepId, but can trace via salesOrder
        if (Object.keys(countryFilter).length > 0) {
          return {
            customer: countryFilter,
          };
        }
        return {};
      default:
        return {};
    }
  }

  // 'own' scope: only records owned by user (or unassigned leads for sales users)
  switch (resource) {
    case 'lead':
      return { 
        OR: [
          { ownerId: auth.userId },
          { ownerId: null }, // Allow access to unassigned leads
        ],
        ...countryFilter,
      };
    case 'customer':
      return countryFilter;
    case 'deal':
      // Filter deals via customer's country
      if (Object.keys(countryFilter).length > 0) {
        return {
          customer: countryFilter,
        };
      }
      return {};
    case 'quote':
      return { 
        salesRepId: auth.userId,
        ...(Object.keys(countryFilter).length > 0 ? {
          customer: countryFilter,
        } : {}),
      };
    case 'sales_order':
      return { 
        salesRepId: auth.userId,
        ...(Object.keys(countryFilter).length > 0 ? {
          customer: countryFilter,
        } : {}),
      };
    case 'invoice':
      // Can trace via salesOrder if needed
      if (Object.keys(countryFilter).length > 0) {
        return {
          customer: countryFilter,
        };
      }
      return {};
    default:
      return {};
  }
}

/**
 * RBAC utility: Strip protected fields from an object based on field permissions
 */
export function applyFieldPermissions<T extends Record<string, any>>(
  data: T,
  fieldPerms: Map<string, FieldPermission>,
  mode: 'view' | 'edit' = 'view',
): T {
  const result = { ...data };

  for (const [field, perm] of fieldPerms.entries()) {
    if (mode === 'view' && !perm.view) {
      // Hide field completely
      delete result[field];
    } else if (mode === 'edit' && !perm.edit) {
      // For edit mode, we might want to keep the field but mark it as read-only
      // For now, we'll just not include it in the editable payload
      delete result[field];
    }
  }

  return result;
}

/**
 * RBAC utility: Check if user can access a specific record
 */
export async function canAccessRecord(
  prisma: PrismaClient,
  auth: AuthContext,
  resource: PermissionResource,
  recordId: string,
  scope: PermissionScope = 'own',
): Promise<boolean> {
  if (!auth.userId) return false;
  if (auth.role === 'admin') return true;

  const visibilityFilter = await getVisibilityFilter(prisma, auth, resource, scope);
  const p: any = prisma;

  let modelName: string;
  switch (resource) {
    case 'lead':
      modelName = 'lead';
      break;
    case 'deal':
      modelName = 'deal';
      break;
    case 'customer':
      modelName = 'customer';
      break;
    case 'product':
      modelName = 'product';
      break;
    case 'quote':
      modelName = 'quote';
      break;
    case 'sales_order':
      modelName = 'salesOrder';
      break;
    case 'invoice':
      modelName = 'invoice';
      break;
    case 'proforma_invoice':
      modelName = 'proformaInvoice';
      break;
    default:
      return false;
  }

  const record = await p[modelName].findFirst({
    where: {
      id: recordId,
      ...visibilityFilter,
    },
    select: { id: true },
  });

  return !!record;
}

