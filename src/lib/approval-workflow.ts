import type { PrismaClient } from '@prisma/client';

export interface ApprovalCheckResult {
  requiresApproval: boolean;
  workflowId?: string;
  approverRoles?: string[];
  approverUserIds?: string[];
}

/**
 * Check if an action requires approval based on configured workflows
 */
export async function checkApprovalRequired(
  prisma: PrismaClient,
  resource: string,
  action: string,
  data?: Record<string, any>
): Promise<ApprovalCheckResult> {
  // Find active workflows matching resource and action
  const workflows = await prisma.approvalWorkflow.findMany({
    where: {
      resource,
      action,
      isActive: true,
      requiresApproval: true,
    },
  });

  if (workflows.length === 0) {
    return { requiresApproval: false };
  }

  // For workflows with thresholds, check if threshold is met
  for (const workflow of workflows) {
    if (workflow.thresholdValue && workflow.thresholdField && data) {
      const fieldValue = data[workflow.thresholdField];
      if (fieldValue !== undefined && fieldValue !== null) {
        const numericValue = Number(fieldValue);
        if (!isNaN(numericValue) && numericValue > Number(workflow.thresholdValue)) {
          return {
            requiresApproval: true,
            workflowId: workflow.id,
            approverRoles: workflow.approverRoles,
            approverUserIds: workflow.approverUserIds,
          };
        }
      }
    } else {
      // No threshold or threshold met - requires approval
      return {
        requiresApproval: true,
        workflowId: workflow.id,
        approverRoles: workflow.approverRoles,
        approverUserIds: workflow.approverUserIds,
      };
    }
  }

  return { requiresApproval: false };
}

/**
 * Create an approval request
 */
export async function createApprovalRequest(
  prisma: PrismaClient,
  params: {
    workflowId?: string | null;
    resource: string;
    resourceId: string;
    action: string;
    requestedById: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const request = await prisma.approvalRequest.create({
    data: {
      workflowId: params.workflowId || null,
      resource: params.resource,
      resourceId: params.resourceId,
      action: params.action,
      status: 'pending',
      requestedById: params.requestedById,
      reason: params.reason || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });

  return request.id;
}

/**
 * Check if a user can approve a request
 */
export async function canApprove(
  prisma: PrismaClient,
  userId: string,
  userRole: string,
  requestId: string
): Promise<boolean> {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { workflow: true },
  });

  if (!request) return false;
  if (request.status !== 'pending') return false;

  // Check if user is in approver list
  if (request.workflow) {
    const approverRoles = request.workflow.approverRoles || [];
    const approverUserIds = request.workflow.approverUserIds || [];

    if (approverRoles.includes(userRole) || approverUserIds.includes(userId)) {
      return true;
    }
  }

  // Admin can always approve
  if (userRole === 'admin') {
    return true;
  }

  return false;
}

/**
 * Approve an approval request
 */
export async function approveRequest(
  prisma: PrismaClient,
  requestId: string,
  approvedById: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: 'approved',
      approvedById,
      reviewedAt: new Date(),
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}

/**
 * Reject an approval request
 */
export async function rejectRequest(
  prisma: PrismaClient,
  requestId: string,
  approvedById: string,
  rejectionReason: string
): Promise<void> {
  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      approvedById,
      reviewedAt: new Date(),
      rejectionReason,
    },
  });
}

/**
 * Get pending approval requests for a user (requests they can approve)
 */
export async function getPendingApprovals(
  prisma: PrismaClient,
  userId: string,
  userRole: string
): Promise<any[]> {
  try {
    // Get all pending requests with workflows
    const allPending = await prisma.approvalRequest.findMany({
      where: { status: 'pending' },
      include: {
        workflow: true,
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    // Filter to requests this user can approve
    return allPending.filter((request) => {
      try {
        if (userRole === 'admin') return true;
        if (!request.workflow) return false;

        // Ensure approverRoles and approverUserIds are arrays
        const approverRoles = Array.isArray(request.workflow.approverRoles) 
          ? request.workflow.approverRoles 
          : [];
        const approverUserIds = Array.isArray(request.workflow.approverUserIds)
          ? request.workflow.approverUserIds
          : [];

        return approverRoles.includes(userRole) || approverUserIds.includes(userId);
      } catch (err) {
        console.error('Error filtering approval request:', err);
        return false;
      }
    });
  } catch (error) {
    console.error('Error in getPendingApprovals:', error);
    return [];
  }
}

/**
 * Check if a resource action is pending approval
 */
export async function isPendingApproval(
  prisma: PrismaClient,
  resource: string,
  resourceId: string,
  action: string
): Promise<boolean> {
  const pending = await prisma.approvalRequest.findFirst({
    where: {
      resource,
      resourceId,
      action,
      status: 'pending',
    },
  });

  return !!pending;
}

