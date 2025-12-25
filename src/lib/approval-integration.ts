import type { PrismaClient } from '@prisma/client';
import { checkApprovalRequired, createApprovalRequest, isPendingApproval } from './approval-workflow';
import { logAudit } from './audit-logger';

export interface ApprovalCheckParams {
  resource: string;
  resourceId: string;
  action: string;
  data: Record<string, any>;
  existingData?: Record<string, any>;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Check if an operation requires approval and create approval request if needed
 * Returns { requiresApproval: boolean, approvalRequestId?: string }
 */
export async function checkAndRequestApproval(
  prisma: PrismaClient,
  params: ApprovalCheckParams
): Promise<{ requiresApproval: boolean; approvalRequestId?: string; error?: string }> {
  try {
    // Check if already pending approval
    const pending = await isPendingApproval(
      prisma,
      params.resource,
      params.resourceId,
      params.action
    );

    if (pending) {
      return {
        requiresApproval: true,
        error: 'An approval request for this action is already pending',
      };
    }

    // Check if approval is required based on workflows
    const approvalCheck = await checkApprovalRequired(
      prisma,
      params.resource,
      params.action,
      params.data
    );

    if (!approvalCheck.requiresApproval) {
      return { requiresApproval: false };
    }

    // Calculate change details for metadata
    // Store complete operation data for execution after approval
    const metadata: Record<string, unknown> = {
      action: params.action,
      updateData: params.data, // Store complete update data for execution
      ...params.data, // Also keep at root level for backward compatibility
    };

    if (params.existingData) {
      metadata.originalValues = params.existingData;
    }

    // Create approval request
    const approvalRequestId = await createApprovalRequest(prisma, {
      workflowId: approvalCheck.workflowId || null,
      resource: params.resource,
      resourceId: params.resourceId,
      action: params.action,
      requestedById: params.userId,
      metadata,
    });

    // Log audit entry
    await logAudit(prisma, {
      userId: params.userId,
      action: 'approval_requested',
      resource: params.resource,
      resourceId: params.resourceId,
      details: {
        approvalRequestId,
        action: params.action,
      },
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });

    return {
      requiresApproval: true,
      approvalRequestId,
    };
  } catch (error) {
    console.error('Failed to check approval requirement:', error);
    // Don't block operation on approval check failure - log and continue
    return { requiresApproval: false };
  }
}

/**
 * Check for price/discount changes that require approval
 */
export async function checkPricingApproval(
  prisma: PrismaClient,
  params: {
    resource: 'quote' | 'invoice' | 'sales_order' | 'proforma_invoice' | 'product';
    resourceId: string;
    userId: string;
    items?: Array<{ unitPrice?: number; discountPct?: number; productId?: string }>;
    unitPrice?: number;
    existingItems?: Array<{ unitPrice?: number; discountPct?: number; productId?: string }>;
    existingUnitPrice?: number;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<{ requiresApproval: boolean; approvalRequestId?: string; error?: string }> {
  // Check for high discounts (>20%)
  if (params.items) {
    for (const item of params.items) {
      if (item.discountPct && item.discountPct > 20) {
        return checkAndRequestApproval(prisma, {
          resource: params.resource,
          resourceId: params.resourceId,
          action: 'discount_override',
          data: {
            action: 'update',
            items: params.items, // Store all items for execution
            discountPct: item.discountPct,
            productId: item.productId,
          },
          existingData: params.existingItems?.find((i) => i.productId === item.productId),
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        });
      }

      // Check for significant price changes (>10% change)
      if (params.existingItems && item.unitPrice && item.productId) {
        const existingItem = params.existingItems.find((i) => i.productId === item.productId);
        if (existingItem?.unitPrice) {
          const priceChange = ((item.unitPrice - existingItem.unitPrice) / existingItem.unitPrice) * 100;
          if (Math.abs(priceChange) > 10) {
            return checkAndRequestApproval(prisma, {
              resource: params.resource,
              resourceId: params.resourceId,
              action: 'pricing_override',
              data: {
                action: 'update',
                items: params.items, // Store all items for execution
                unitPrice: item.unitPrice,
                productId: item.productId,
                priceChangePct: priceChange,
              },
              existingData: existingItem,
              userId: params.userId,
              ipAddress: params.ipAddress,
              userAgent: params.userAgent,
            });
          }
        }
      }
    }
  }

  // Check for product base price changes
  if (params.unitPrice !== undefined && params.existingUnitPrice !== undefined) {
    const priceChange = ((params.unitPrice - params.existingUnitPrice) / params.existingUnitPrice) * 100;
    if (Math.abs(priceChange) > 10) {
      return checkAndRequestApproval(prisma, {
        resource: 'product',
        resourceId: params.resourceId,
        action: 'pricing_override',
        data: {
          action: 'update',
          unitPrice: params.unitPrice,
          priceChangePct: priceChange,
        },
        existingData: { unitPrice: params.existingUnitPrice },
        userId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    }
  }

  return { requiresApproval: false };
}

