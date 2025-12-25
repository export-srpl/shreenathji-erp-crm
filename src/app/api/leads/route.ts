import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { leadSchema, validateInput } from '@/lib/validation';
import { generateSRPLId } from '@/lib/srpl-id-generator';
import { logActivity } from '@/lib/activity-logger';
import { runAutomationRules } from '@/lib/automation-engine';
import { updateLeadScore } from '@/lib/lead-scoring';
import { trackStageChange } from '@/lib/lead-aging';
import { getVisibilityFilter, hasPermission, getFieldPermissions, applyFieldPermissions } from '@/lib/rbac';

// GET /api/leads - list leads
export async function GET(req: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth();
    if (authError) {
      console.error('Leads GET - authentication failed:', authError.status);
      return authError;
    }

    let prisma;
    try {
      prisma = await getPrismaClient();
    } catch (prismaError: any) {
      console.error('Leads GET - error getting Prisma client:', prismaError);
      return NextResponse.json(
        { error: 'Database connection error', details: prismaError.message },
        { status: 500 }
      );
    }

    let auth;
    try {
      auth = await getAuthContext(req);
    } catch (authCtxError: any) {
      console.error('Leads GET - error getting auth context:', authCtxError);
      return NextResponse.json(
        { error: 'Authentication error', details: authCtxError.message },
        { status: 500 }
      );
    }

    if (!auth.userId) {
      console.error('Leads GET - no userId in auth context');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check view permission
    let canView = false;
    try {
      canView = await hasPermission(prisma, auth, 'lead', 'view', 'own');
    } catch (permError: any) {
      console.error('Leads GET - error checking permissions:', permError);
      // Fail-safe: only admin can proceed if permission check fails
      canView = auth.role === 'admin';
    }

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get visibility filter based on user's scope (includes country filtering for salesScope)
    let visibilityFilter: any = {};
    try {
      visibilityFilter = await getVisibilityFilter(prisma, auth, 'lead', 'team'); // Use 'team' to see team + own
    } catch (rbacError: any) {
      console.error('Leads GET - error getting visibility filter:', rbacError);
      console.error('Leads GET - RBAC error stack:', rbacError.stack);
      // Fallback: if RBAC fails, admin sees all, others see own + country via simple filter
      if (auth.role === 'admin') {
        visibilityFilter = {};
      } else {
        visibilityFilter = { ownerId: auth.userId };
      }
    }

    // Ensure visibilityFilter is a valid object
    if (!visibilityFilter || typeof visibilityFilter !== 'object' || Array.isArray(visibilityFilter)) {
      console.warn('Leads GET - invalid visibility filter, using empty object');
      visibilityFilter = {};
    }

    // Clean the filter - remove any undefined or null values that might cause Prisma errors
    const cleanFilter: any = {};
    for (const [key, value] of Object.entries(visibilityFilter)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          const cleanNested: any = {};
          for (const [nestedKey, nestedValue] of Object.entries(value)) {
            if (nestedValue !== undefined && nestedValue !== null) {
              cleanNested[nestedKey] = nestedValue;
            }
          }
          if (Object.keys(cleanNested).length > 0) {
            cleanFilter[key] = cleanNested;
          }
        } else {
          cleanFilter[key] = value;
        }
      }
    }

    console.log('Leads GET - fetching leads with filter:', JSON.stringify(cleanFilter));
    console.log('Leads GET - user role:', auth.role);
    console.log('Leads GET - user salesScope:', auth.salesScope);

    // Determine where clause
    const whereClause = Object.keys(cleanFilter).length > 0 ? cleanFilter : undefined;

    const fieldPerms = await getFieldPermissions(prisma, auth, 'lead');

    let rawLeads;
    try {
      // Simple connection test
      const totalLeads = await prisma.lead.count();
      console.log(`Leads GET - database connection OK. Total leads in DB: ${totalLeads}`);

      // Main query
      rawLeads = await prisma.lead.findMany({
        where: whereClause,
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
          // Phase 2: Lead Scoring & Aging
          score: true,
          temperature: true,
          lastActivityDate: true,
          winLossReasonId: true,
          wonLostAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbError: any) {
      console.error('Leads GET - database query error:', dbError);
      console.error('Leads GET - error name:', dbError.name);
      console.error('Leads GET - error code:', dbError.code);
      console.error('Leads GET - error message:', dbError.message);
      if (process.env.NODE_ENV === 'development') {
        console.error('Leads GET - error stack:', dbError.stack);
      }
      console.error('Leads GET - filter that caused error:', JSON.stringify(cleanFilter));
      console.error('Leads GET - where clause:', JSON.stringify(whereClause));

      // Try a fallback query without filter
      try {
        console.log('Leads GET - attempting fallback query without filter...');
        rawLeads = await prisma.lead.findMany({
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
          take: 200,
        });
        console.log('Leads GET - fallback query succeeded, returning limited results');
      } catch (fallbackError: any) {
        console.error('Leads GET - fallback query also failed:', fallbackError);
        console.error('Leads GET - fallback error details:', {
          name: fallbackError.name,
          code: fallbackError.code,
          message: fallbackError.message,
        });
        return NextResponse.json(
          {
            error: 'Database query failed',
            details: dbError.message || 'Unknown database error',
            code: dbError.code || 'UNKNOWN_ERROR',
            name: dbError.name || 'Error',
            fallbackError: fallbackError.message,
            stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined,
          },
          { status: 500 },
        );
      }
    }

    // Apply field-level permissions and map fields
    const leads = (rawLeads || []).map((lead: (typeof rawLeads)[number]) => {
      const mapped = {
        ...lead,
        // Map Prisma "source" to frontend "leadSource"
        leadSource: (lead as any).source ?? '',
        assignedSalesperson: lead.ownerId || '',
      };
      // Strip protected fields
      return applyFieldPermissions(mapped, fieldPerms, 'view');
    });

    console.log(`Leads GET - returning ${leads.length} leads`);
    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('Leads GET - unexpected error:', error);
    console.error('Leads GET - error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Failed to fetch leads',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
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

  // Initialize lastActivityDate and track initial stage
  const initialStatus = validatedData.status || 'New';
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lastActivityDate: new Date(),
    },
  });

  // Track initial stage aging
  await trackStageChange(prisma, lead.id, body.statusId || null, initialStatus);

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

  // Calculate initial lead score (async, best-effort)
  await updateLeadScore(prisma, lead.id);

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

  // Fetch lead with score
  const leadWithScore = await prisma.lead.findUnique({
    where: { id: lead.id },
  });

  return NextResponse.json(leadWithScore || lead, { status: 201 });
}


