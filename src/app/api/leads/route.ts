import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { leadSchema, validateInput } from '@/lib/validation';

// GET /api/leads - list leads
export async function GET(_req: Request) {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();

  // NOTE: Prisma model uses "source" field; UI expects "leadSource" + "assignedSalesperson"
  const rawLeads = await prisma.lead.findMany({
    select: {
      id: true,
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
    },
    orderBy: { createdAt: 'desc' },
  });

  const leads = rawLeads.map((lead: typeof rawLeads[number]) => ({
    ...lead,
    // Map Prisma "source" to frontend "leadSource"
    leadSource: (lead as any).source ?? '',
    // Placeholder for now; can be wired to owner/user later
    assignedSalesperson: '',
  }));

  return NextResponse.json(leads);
}

// POST /api/leads - create a new lead
export async function POST(req: Request) {
  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

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

  const lead = await prisma.lead.create({
    data: {
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
      ownerId: body.ownerId ?? null,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}


