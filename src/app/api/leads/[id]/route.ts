import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { leadUpdateSchema, validateInput } from '@/lib/validation';
import { logActivity } from '@/lib/activity-logger';
import { runAutomationRules } from '@/lib/automation-engine';
import { canAccessRecord, hasPermission, getFieldPermissions, applyFieldPermissions } from '@/lib/rbac';
import { updateLeadScore } from '@/lib/lead-scoring';
import { trackStageChange } from '@/lib/lead-aging';

type Params = {
  params: { id: string };
};

// GET /api/leads/[id] - fetch a single lead
export async function GET(req: Request, { params }: Params) {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);

  // Admin can access all leads
  // For other users, check if they can view leads (sales users can view leads in their scope)
  if (auth.role !== 'admin') {
    // First check if the lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true, country: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if user has view permission for leads
    const canView = await hasPermission(prisma, auth, 'lead', 'view', 'own') || 
                     await hasPermission(prisma, auth, 'lead', 'view', 'team') ||
                     await hasPermission(prisma, auth, 'lead', 'view', 'all');
    
    // If user has view permission, check country-based access (sales scope)
    if (canView) {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId! },
        select: { salesScope: true },
      });

      if (user?.salesScope === 'domestic_sales' && lead.country !== 'India') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (user?.salesScope === 'export_sales' && lead.country === 'India') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // If no salesScope restriction or country matches, allow access
    } else {
      // If no explicit permission, allow if user owns the lead or it's unassigned
      if (lead.ownerId !== auth.userId && lead.ownerId !== null) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      owner: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Apply field-level permissions
  const fieldPerms = await getFieldPermissions(prisma, auth, 'lead');
  const sanitized = applyFieldPermissions(lead as any, fieldPerms, 'view');

  return NextResponse.json(sanitized);
}

// PATCH /api/leads/[id] - update an existing lead
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  const prisma = await getPrismaClient();

  // Admin can update all leads
  // For other users, check if they can update leads (sales users can update leads in their scope)
  if (auth.role !== 'admin') {
    // First check if the lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true, country: true },
    });

    if (!existingLead) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if user has update permission for leads
    const canUpdate = await hasPermission(prisma, auth, 'lead', 'update', 'own') || 
                      await hasPermission(prisma, auth, 'lead', 'update', 'team') ||
                      await hasPermission(prisma, auth, 'lead', 'update', 'all');
    
    // If user has update permission, check country-based access (sales scope)
    if (canUpdate) {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId! },
        select: { salesScope: true },
      });

      if (user?.salesScope === 'domestic_sales' && existingLead.country !== 'India') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (user?.salesScope === 'export_sales' && existingLead.country === 'India') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // If no salesScope restriction or country matches, allow update
    } else {
      // If no explicit permission, allow if user owns the lead or it's unassigned
      if (existingLead.ownerId !== auth.userId && existingLead.ownerId !== null) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  const body = await req.json();

  try {
    // Load existing lead for diffing
    const existing = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Get field permissions and strip protected fields
    const fieldPerms = await getFieldPermissions(prisma, auth, 'lead');
    const sanitizedBody = applyFieldPermissions(body, fieldPerms, 'edit');

    // Validate and sanitize incoming data (all fields optional on update)
    // Pre-process followUpDate to handle various formats
    if (sanitizedBody.followUpDate !== undefined && sanitizedBody.followUpDate !== null) {
      if (typeof sanitizedBody.followUpDate === 'string') {
        // Try to parse as date
        const parsed = new Date(sanitizedBody.followUpDate);
        if (!isNaN(parsed.getTime())) {
          sanitizedBody.followUpDate = parsed.toISOString();
        }
      } else if (sanitizedBody.followUpDate instanceof Date) {
        sanitizedBody.followUpDate = sanitizedBody.followUpDate.toISOString();
      }
    }

    const validation = validateInput(leadUpdateSchema, sanitizedBody);
    if (!validation.success) {
      console.error('Lead update validation failed:', {
        errors: validation.error.errors,
        body: sanitizedBody,
      });
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const data = validation.data as any;

    // Allow full update for all authenticated users (not just admin)
    // Field-level permissions are handled by applyFieldPermissions above
    const updateData: any = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.statusId !== undefined) updateData.statusId = data.statusId;
    if (data.followUpDate !== undefined) {
      if (data.followUpDate === null || data.followUpDate === '') {
        updateData.followUpDate = null;
      } else {
        try {
          updateData.followUpDate = new Date(data.followUpDate);
          // Validate the date
          if (isNaN(updateData.followUpDate.getTime())) {
            console.warn('Invalid followUpDate provided, setting to null:', data.followUpDate);
            updateData.followUpDate = null;
          }
        } catch (e) {
          console.warn('Error parsing followUpDate, setting to null:', e);
          updateData.followUpDate = null;
        }
      }
    }
    if (data.productInterest !== undefined) updateData.productInterest = data.productInterest;
    if (data.application !== undefined) updateData.application = data.application;
    if (data.monthlyRequirement !== undefined) updateData.monthlyRequirement = data.monthlyRequirement;
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.gstNo !== undefined) updateData.gstNo = data.gstNo;
    if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
    if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.notes !== undefined) updateData.notes = data.notes;
    // Only allow ownerId update for admin
    if (data.ownerId !== undefined && isRoleAllowed(auth.role, ['admin'])) {
      updateData.ownerId = data.ownerId;
    }

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
    });

    // Determine key changes for activity log
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (data.status !== undefined && data.status !== existing.status) {
      changes.status = { old: existing.status, new: data.status };
    }
    if (data.followUpDate !== undefined) {
      const oldVal = existing.followUpDate ? existing.followUpDate.toISOString() : null;
      const newVal = data.followUpDate ? data.followUpDate : null;
      if (oldVal !== newVal) {
        changes.followUpDate = { old: oldVal, new: newVal };
      }
    }
    if (data.ownerId !== undefined && data.ownerId !== existing.ownerId) {
      changes.ownerId = { old: existing.ownerId, new: data.ownerId };
    }
    // Track notes/remarks changes separately for detailed logging
    const notesChanged = data.notes !== undefined && data.notes !== existing.notes;
    if (notesChanged) {
      changes.notes = { old: existing.notes || '', new: data.notes || '' };
    }

    // Log notes/remarks update separately with detailed description
    if (notesChanged) {
      const notesDescription = data.notes && data.notes.trim()
        ? `Remarks/Notes updated: "${data.notes.substring(0, 200)}${data.notes.length > 200 ? '...' : ''}"`
        : 'Remarks/Notes cleared';
      
      await logActivity({
        prisma,
        module: 'LEAD',
        entityType: 'lead',
        entityId: updated.id,
        srplId: updated.srplId || undefined,
        action: 'update',
        field: 'notes',
        oldValue: existing.notes || null,
        newValue: data.notes || null,
        description: notesDescription,
        metadata: {
          notesLength: data.notes ? data.notes.length : 0,
          previousNotesLength: existing.notes ? existing.notes.length : 0,
        },
        performedById: auth.userId,
      });
    }

    // Log a summary activity for other changes (excluding notes, which is logged separately)
    const otherChanges = Object.fromEntries(
      Object.entries(changes).filter(([key]) => key !== 'notes')
    );
    if (Object.keys(otherChanges).length > 0) {
      const changedFields = Object.keys(otherChanges).join(', ');
      await logActivity({
        prisma,
        module: 'LEAD',
        entityType: 'lead',
        entityId: updated.id,
        srplId: updated.srplId || undefined,
        action: otherChanges.status ? 'stage_change' : 'update',
        field: undefined,
        oldValue: undefined,
        newValue: undefined,
        description: `Lead updated (${changedFields})`,
        metadata: {
          changes: otherChanges,
        },
        performedById: auth.userId,
      });
    }

    // Track stage aging if status changed
    if (changes.status) {
      const newStatus = data.status || updated.status;
      const stageId = data.statusId || updated.statusId || null;
      await trackStageChange(prisma, updated.id, stageId, newStatus);
      
      // Update last activity date when stage changes
      await prisma.lead.update({
        where: { id: updated.id },
        data: { lastActivityDate: new Date() },
      });
    } else if (Object.keys(changes).length > 0) {
      // Update last activity date for other changes
      await prisma.lead.update({
        where: { id: updated.id },
        data: { lastActivityDate: new Date() },
      });
    }

    // Update lead score (async, best-effort)
    await updateLeadScore(prisma, updated.id);

    // Run automation rules if there were any changes
    if (Object.keys(changes).length > 0) {
      await runAutomationRules({
        prisma,
        module: 'LEAD',
        triggerType: changes.status ? 'on_stage_change' : 'on_update',
        entityType: 'lead',
        entityId: updated.id,
        current: updated as any,
        previous: existing as any,
        performedById: auth.userId,
      });
    }

    // Fetch updated lead with score
    const leadWithScore = await prisma.lead.findUnique({
      where: { id: updated.id },
    });

    return NextResponse.json(leadWithScore || updated);
  } catch (error) {
    console.error('Failed to update lead', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

// DELETE /api/leads/[id] - delete a lead (admin only)
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();

  try {
    await prisma.lead.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lead', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}

