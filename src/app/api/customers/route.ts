import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

// GET /api/customers - list customers
export async function GET() {
  const prisma = await getPrismaClient();
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(customers);
}

// POST /api/customers - create a new customer
export async function POST(req: Request) {
  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  const customer = await prisma.customer.create({
    data: {
      companyName: body.companyName,
      customerType: body.customerType,
      country: body.country,
      state: body.state,
      gstNo: body.gstNo,
      billingAddress: body.billingAddress,
      shippingAddress: body.shippingAddress,
      contactName: body.contactPerson?.name,
      contactEmail: body.contactPerson?.email,
      contactPhone: body.contactPerson?.phone,
      contactTitle: body.contactPerson?.designation,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}


