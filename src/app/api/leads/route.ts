import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

// GET /api/leads - list leads
export async function GET() {
  const prisma = await getPrismaClient();
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
  });

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

  const lead = await prisma.lead.create({
    data: {
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
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      notes: body.notes,
      ownerId: body.ownerId ?? null,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}


