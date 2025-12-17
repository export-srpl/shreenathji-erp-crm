import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

// GET /api/leads/[id] - fetch a single lead
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
  });

  if (!lead) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(lead);
}

// PATCH /api/leads/[id] - update an existing lead
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  try {
    // When editing, only allow updating specific fields: status, followUpDate, productInterest, application, monthlyRequirement
    // Other fields remain unchanged unless explicitly provided
    const updateData: any = {};
    
    if (body.status !== undefined) updateData.status = body.status;
    if (body.followUpDate !== undefined) {
      updateData.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null;
    }
    if (body.productInterest !== undefined) updateData.productInterest = body.productInterest;
    if (body.application !== undefined) updateData.application = body.application;
    if (body.monthlyRequirement !== undefined) updateData.monthlyRequirement = body.monthlyRequirement;
    
    // Allow full update if explicitly requested (for admin/initial creation)
    if (body.allowFullUpdate) {
      updateData.companyName = body.companyName;
      updateData.contactName = body.contactName;
      updateData.email = body.email;
      updateData.phone = body.phone;
      updateData.country = body.country;
      updateData.state = body.state;
      updateData.city = body.city;
      updateData.gstNo = body.gstNo;
      updateData.billingAddress = body.billingAddress;
      updateData.shippingAddress = body.shippingAddress;
      updateData.source = body.leadSource;
      updateData.notes = body.notes;
    }

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update lead', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}


