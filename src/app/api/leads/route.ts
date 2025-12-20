import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { leadSchema, validateInput } from '@/lib/validation';
import { generateSRPLId } from '@/lib/srpl-id-generator';
import { logActivity } from '@/lib/activity-logger';
import { runAutomationRules } from '@/lib/automation-engine';
import { getVisibilityFilter, hasPermission, getFieldPermissions, applyFieldPermissions } from '@/lib/rbac';

// GET /api/leads - list leads
export async function GET(req: Request) {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);

  // Check view permission
  const canView = await hasPermission(prisma, auth, 'lead', 'view', 'own');
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get visibility filter based on user's scope (includes country filtering for salesScope)
  const visibilityFilter = await getVisibilityFilter(prisma, auth, 'lead', 'team'); // Use 'team' to see team + own
  const fieldPerms = await getFieldPermissions(prisma, auth, 'lead');

  // NOTE: Prisma model uses "source" field; UI expects "leadSource" + "assignedSalesperson"
  const rawLeads = await prisma.lead.findMany({
    where: visibilityFilter,
    select: {
      id: true,
      srplId: true,
      companyName: true,
      contactName: true,
      email: true,
      phone: true,
      status: true,
      source: true,
      country: true,
      state: true,
      city: true,
      productInterest: true,
      application: true,
      monthlyRequirement: true,
      followUpDate: true,
      createdAt: true,
      ownerId: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Apply field-level permissions and map fields
  const leads = rawLeads.map((lead: typeof rawLeads[number]) => {
    const mapped = {
      ...lead,
      // Map Prisma "source" to frontend "leadSource"
      leadSource: (lead as any).source ?? '',
      assignedSalesperson: lead.ownerId || '',
    };
    // Strip protected fields
    return applyFieldPermissions(mapped, fieldPerms, 'view');
  });

  return NextResponse.json(leads);
}

// POST /api/leads - create a new lead
export async function POST(req: Request) {
  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);
  
  // Check create permission
  const canCreate = await hasPermission(prisma, auth, 'lead', 'create', 'own');
  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Get field permissions and strip protected fields from input
  const fieldPerms = await getFieldPermissions(prisma, auth, 'lead');
  const sanitizedBody = applyFieldPermissions(body, fieldPerms, 'edit');

  // Check for duplicates before creating
  const { checkDuplicates } = await import('@/lib/data-hygiene');
  const duplicates = await checkDuplicates(prisma, {
    companyName: body.companyName,
    email: body.email,
    phone: body.phone,
    gstNo: body.gstNo,
    vatNumber: body.vatNumber,
  });

  // If duplicates found, return them but allow creation (user can choose to proceed)
  if (duplicates.length > 0) {
    // Return duplicates in response but don't block creation
    // Frontend can show a warning dialog
  }

  // SECURITY: Validate and sanitize input
  const validationData = {
    companyName: body.companyName,
    contactName: body.contactName,
    email: body.email,
    phone: body.phone,
    country: body.country,
    state: body.state,
    city: body.city,
    gstNo: body.gstNo,
    billingAddress: body.billingAddress,
    shippingAddress: body.shippingAddress,
    status: body.status || 'New',
    source: body.leadSource,
    productInterest: body.productInterest,
    application: body.application,
    monthlyRequirement: body.monthlyRequirement,
    followUpDate: body.followUpDate,
    notes: body.notes,
  };

  const validation = validateInput(leadSchema, validationData);
  if (!validation.success) {
    return NextResponse.json(
      { 
        error: 'Validation failed', 
        details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      },
      { status: 400 }
    );
  }

  const validatedData = validation.data;

  // Enforce country restriction based on salesScope
  if (auth.salesScope === 'domestic_sales' && validatedData.country !== 'India') {
    return NextResponse.json(
      { error: 'Domestic Sales users can only create leads for India' },
      { status: 403 }
    );
  }
  if (auth.salesScope === 'export_sales' && validatedData.country === 'India') {
    return NextResponse.json(
      { error: 'Export Sales users can only create leads for countries other than India' },
      { status: 403 }
    );
  }

  // Generate SRPL ID atomically
  const srplId = await generateSRPLId({
    moduleCode: 'LEAD',
    prisma,
  });

  // Auto-assign to current user if no owner specified
  const ownerId = sanitizedBody.ownerId || auth.userId || null;

  const lead = await prisma.lead.create({
    data: {
      srplId, // Auto-generated SRPL ID
      companyName: validatedData.companyName,
      contactName: validatedData.contactName,
      email: validatedData.email,
      phone: validatedData.phone,
      country: validatedData.country,
      state: validatedData.state,
      city: validatedData.city,
      gstNo: validatedData.gstNo,
      billingAddress: validatedData.billingAddress,
      shippingAddress: validatedData.shippingAddress,
      status: validatedData.status,
      source: validatedData.source,
      productInterest: validatedData.productInterest,
      application: validatedData.application,
      monthlyRequirement: validatedData.monthlyRequirement,
      followUpDate: validatedData.followUpDate ? new Date(validatedData.followUpDate) : null,
      notes: validatedData.notes,
      ownerId: ownerId,
    },
  });

  // Log activity: lead created
  await logActivity({
    prisma,
    module: 'LEAD',
    entityType: 'lead',
    entityId: lead.id,
    srplId: lead.srplId || undefined,
    action: 'create',
    description: `Lead created: ${lead.companyName}`,
    metadata: {
      payload: validationData,
    },
    performedById: auth.userId,
  });

  // Run workflow automation for lead creation
  await runAutomationRules({
    prisma,
    module: 'LEAD',
    triggerType: 'on_create',
    entityType: 'lead',
    entityId: lead.id,
    current: lead as any,
    previous: null,
    performedById: auth.userId,
  });

  return NextResponse.json(lead, { status: 201 });
}


