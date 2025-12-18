import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { customerSchema, validateInput } from '@/lib/validation';

// GET /api/customers - list customers
export async function GET(req: Request) {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      companyName: true,
      customerType: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      contactTitle: true,
      billingAddress: true,
      shippingAddress: true,
      country: true,
      state: true,
      city: true,
      gstNo: true,
      createdAt: true,
    },
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

  // SECURITY: Validate and sanitize input
  const validationData = {
    companyName: body.companyName,
    customerType: body.customerType,
    country: body.country,
    state: body.state,
    city: body.city,
    gstNo: body.gstNo,
    billingAddress: body.billingAddress,
    shippingAddress: body.shippingAddress,
    contactName: body.contactPerson?.name,
    contactEmail: body.contactPerson?.email,
    contactPhone: body.contactPerson?.phone,
    contactTitle: body.contactPerson?.designation,
  };

  const validation = validateInput(customerSchema, validationData);
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

  const customer = await prisma.customer.create({
    data: {
      companyName: validatedData.companyName,
      customerType: validatedData.customerType,
      country: validatedData.country,
      state: validatedData.state,
      city: validatedData.city,
      gstNo: validatedData.gstNo,
      billingAddress: validatedData.billingAddress,
      shippingAddress: validatedData.shippingAddress,
      contactName: validatedData.contactName,
      contactEmail: validatedData.contactEmail,
      contactPhone: validatedData.contactPhone,
      contactTitle: validatedData.contactTitle,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}


