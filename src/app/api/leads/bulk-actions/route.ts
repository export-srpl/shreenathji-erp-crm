import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { trackStageChange } from '@/lib/lead-aging';
import { updateLeadScore } from '@/lib/lead-scoring';
import { alertBulkOperation } from '@/lib/security-alerts';
import { logAudit } from '@/lib/audit-logger';
import { getAlertThresholds } from '@/lib/alert-config';

/**
 * POST /api/leads/bulk-actions
 * Perform bulk actions on multiple leads
 * Body: { action: 'update_stage' | 'assign' | 'schedule_followup', leadIds: string[], ...actionData }
 */
export async function POST(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, leadIds, ...actionData } = body;

    if (!action || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and leadIds array are required' },
        { status: 400 }
      );
    }

    // Check permissions based on action
    const prisma = await getPrismaClient();
    
    // For bulk actions, require admin or sales role
    if (!isRoleAllowed(auth.role, ['admin', 'sales'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Phase 4: Alert on large bulk operations (non-blocking)
    const thresholds = getAlertThresholds();
    if (leadIds.length > thresholds.bulkOperationCount && auth.userId) {
      const ipAddress = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        null;
      alertBulkOperation(
        prisma,
        auth.userId,
        'lead',
        action,
        leadIds.length,
        ipAddress
      ).catch(err => console.warn('Failed to create bulk operation alert:', err));
    }

    // Phase 4: Log audit entry for bulk operation
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      null;
    const userAgent = req.headers.get('user-agent') || null;
    
    logAudit(prisma, {
      userId: auth.userId,
      action: `bulk_${action}`,
      resource: 'lead',
      resourceId: null, // Bulk operation affects multiple resources
      details: {
        action,
        leadCount: leadIds.length,
        ...actionData,
      },
      ipAddress,
      userAgent,
    }).catch(err => console.warn('Failed to log bulk operation audit:', err));

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    switch (action) {
      case 'update_stage': {
        const { status, statusId, winLossReasonId } = actionData;
        if (!status) {
          return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        // Require win/loss reason for Won/Lost/Disqualified
        const requiresReason = ['Won', 'Lost', 'Converted', 'Disqualified'].includes(status);
        if (requiresReason && !winLossReasonId) {
          return NextResponse.json(
            {
              error: 'Win/Loss reason is required',
              message: `A reason is required when marking leads as ${status}`,
            },
            { status: 400 }
          );
        }

        for (const leadId of leadIds) {
          try {
            const existing = await prisma.lead.findUnique({ where: { id: leadId } });
            if (!existing) {
              results.push({ id: leadId, success: false, error: 'Lead not found' });
              continue;
            }

            const updateData: any = {
              status,
              lastActivityDate: new Date(),
            };

            if (statusId) updateData.statusId = statusId;
            if (requiresReason && winLossReasonId) {
              updateData.winLossReasonId = winLossReasonId;
              updateData.wonLostAt = new Date();
            }

            const updated = await prisma.lead.update({
              where: { id: leadId },
              data: updateData,
            });

            // Track stage change
            await trackStageChange(prisma, leadId, statusId || null, status);

            // Update score
            await updateLeadScore(prisma, leadId);

            // Log activity
            await logActivity({
              prisma,
              module: 'LEAD',
              entityType: 'lead',
              entityId: leadId,
              srplId: updated.srplId || undefined,
              action: 'stage_change',
              field: 'status',
              oldValue: existing.status,
              newValue: status,
              description: `Bulk status update: "${existing.status}" to "${status}"`,
              performedById: auth.userId,
            });

            results.push({ id: leadId, success: true });
          } catch (error: any) {
            results.push({
              id: leadId,
              success: false,
              error: error.message || 'Update failed',
            });
          }
        }
        break;
      }

      case 'assign': {
        const { ownerId } = actionData;
        if (!ownerId) {
          return NextResponse.json({ error: 'ownerId is required' }, { status: 400 });
        }

        for (const leadId of leadIds) {
          try {
            const existing = await prisma.lead.findUnique({ where: { id: leadId } });
            if (!existing) {
              results.push({ id: leadId, success: false, error: 'Lead not found' });
              continue;
            }

            const updated = await prisma.lead.update({
              where: { id: leadId },
              data: {
                ownerId: ownerId || null,
                lastActivityDate: new Date(),
              },
            });

            // Update score (assignment affects score)
            await updateLeadScore(prisma, leadId);

            // Log activity
            await logActivity({
              prisma,
              module: 'LEAD',
              entityType: 'lead',
              entityId: leadId,
              srplId: updated.srplId || undefined,
              action: 'update',
              field: 'ownerId',
              oldValue: existing.ownerId,
              newValue: ownerId,
              description: `Bulk assignment: Lead assigned to user ${ownerId}`,
              performedById: auth.userId,
            });

            results.push({ id: leadId, success: true });
          } catch (error: any) {
            results.push({
              id: leadId,
              success: false,
              error: error.message || 'Assignment failed',
            });
          }
        }
        break;
      }

      case 'schedule_followup': {
        const { followUpDate } = actionData;
        if (!followUpDate) {
          return NextResponse.json({ error: 'followUpDate is required' }, { status: 400 });
        }

        for (const leadId of leadIds) {
          try {
            const updated = await prisma.lead.update({
              where: { id: leadId },
              data: {
                followUpDate: new Date(followUpDate),
                lastActivityDate: new Date(),
              },
            });

            // Log activity
            await logActivity({
              prisma,
              module: 'LEAD',
              entityType: 'lead',
              entityId: leadId,
              srplId: updated.srplId || undefined,
              action: 'update',
              field: 'followUpDate',
              newValue: followUpDate,
              description: `Bulk follow-up scheduled: ${followUpDate}`,
              performedById: auth.userId,
            });

            results.push({ id: leadId, success: true });
          } catch (error: any) {
            results.push({
              id: leadId,
              success: false,
              error: error.message || 'Scheduling failed',
            });
          }
        }
        break;
      }

      case 'delete': {
        // Only admin can delete leads
        if (!isRoleAllowed(auth.role, ['admin'])) {
          return NextResponse.json({ error: 'Only admins can delete leads' }, { status: 403 });
        }

        for (const leadId of leadIds) {
          try {
            const existing = await prisma.lead.findUnique({
              where: { id: leadId },
              select: { id: true, srplId: true, companyName: true },
            });

            if (!existing) {
              results.push({ id: leadId, success: false, error: 'Lead not found' });
              continue;
            }

            // Log activity before deletion
            await logActivity({
              prisma,
              module: 'LEAD',
              entityType: 'lead',
              entityId: leadId,
              srplId: existing.srplId || undefined,
              action: 'delete',
              description: `Bulk delete: Lead "${existing.companyName}" (${existing.srplId || leadId}) deleted`,
              performedById: auth.userId,
            });

            // Delete the lead
            await prisma.lead.delete({
              where: { id: leadId },
            });

            results.push({ id: leadId, success: true });
          } catch (error: any) {
            results.push({
              id: leadId,
              success: false,
              error: error.message || 'Delete failed',
            });
          }
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error('Failed to perform bulk action:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform bulk action',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

