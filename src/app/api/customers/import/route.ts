import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const customers = body.customers as Array<{
    customerType: string;
    companyName: string;
    billingAddress: string;
    shippingAddress: string;
    country: string;
    state?: string;
    cityState?: string;
    gstNo?: string;
    contactPerson: {
      name: string;
      email: string;
      designation: string;
      phone: string;
    };
  }>;

  if (!Array.isArray(customers) || customers.length === 0) {
    return NextResponse.json({ error: 'No customers provided' }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const created = await prisma.$transaction(
    customers.map(c =>
      prisma.customer.create({
        data: {
          companyName: c.companyName,
          customerType: c.customerType,
          country: c.country,
          state: c.state ?? null,
          gstNo: c.gstNo ?? null,
          billingAddress: c.billingAddress,
          shippingAddress: c.shippingAddress,
          contactName: c.contactPerson.name,
          contactEmail: c.contactPerson.email,
          contactPhone: c.contactPerson.phone,
          contactTitle: c.contactPerson.designation,
        },
      }),
    ),
  );

  return NextResponse.json(created, { status: 201 });
}


