/**
 * Enhanced Permissions Utilities
 * 
 * Extended permission checks for:
 * - Approval workflow permissions (who can approve what)
 * - Audit log access permissions
 * - Pricing operation permissions
 */

import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from './auth';

/**
 * Check if user can approve requests for a specific resource/action
 */
export async function canApproveResource(
  prisma: PrismaClient,
  auth: AuthContext,
  resource: string,
  action: string
): Promise<boolean> {
  if (!auth.userId) return false;

  // Admin can always approve
  if (auth.role === 'admin') return true;

  // Check if user has approval permission for this resource/action
  // This can be extended to check ApprovalWorkflow.approverRoles/approverUserIds
  const workflow = await prisma.approvalWorkflow.findFirst({
    where: {
      resource,
      action,
      isActive: true,
      OR: [
        { approverRoles: { has: auth.role } },
        { approverUserIds: { has: auth.userId } },
      ],
    },
  });

  return !!workflow;
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(auth: AuthContext): boolean {
  if (!auth.userId) return false;
  
  // Only admin can view audit logs by default
  // Can be extended to allow other roles with specific permissions
  return auth.role === 'admin';
}

/**
 * Check if user can export audit logs
 */
export function canExportAuditLogs(auth: AuthContext): boolean {
  if (!auth.userId) return false;
  
  // Only admin can export audit logs
  return auth.role === 'admin';
}

/**
 * Check if user can perform pricing operations without approval
 */
export async function canPerformPricingOperation(
  prisma: PrismaClient,
  auth: AuthContext,
  resource: string,
  discountPct?: number,
  priceChangePct?: number
): Promise<boolean> {
  if (!auth.userId) return false;

  // Admin can always perform pricing operations
  if (auth.role === 'admin') return true;

  // Check if operation requires approval based on thresholds
  // High discounts or significant price changes require approval
  const requiresApproval = 
    (discountPct && discountPct > 20) ||
    (priceChangePct && Math.abs(priceChangePct) > 10);

  if (requiresApproval) {
    // Check if user has permission to perform pricing operations that require approval
    // By default, only admin can perform these operations without approval
    // This can be extended to check specific permissions
    return false;
  }

  // For low-risk pricing operations, sales/finance roles can proceed
  return auth.role === 'sales' || auth.role === 'finance';
}

/**
 * Check if user can manage approval workflows
 */
export function canManageApprovalWorkflows(auth: AuthContext): boolean {
  if (!auth.userId) return false;
  
  // Only admin can manage approval workflows
  return auth.role === 'admin';
}

/**
 * Check if user can acknowledge security alerts
 */
export function canAcknowledgeSecurityAlerts(auth: AuthContext): boolean {
  if (!auth.userId) return false;
  
  // Admin can acknowledge all alerts
  // Can be extended to allow other roles with specific permissions
  return auth.role === 'admin';
}

