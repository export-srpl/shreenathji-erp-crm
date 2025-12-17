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
    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: {
        companyName: body.companyName,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        country: body.country,
        state: body.state,
        gstNo: body.gstNo,
        billingAddress: body.billingAddress,
        shippingAddress: body.shippingAddress,
        status: body.status,
        source: body.leadSource,
        notes: body.notes,
        // optional fields can be added here as you extend the schema
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update lead', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}


