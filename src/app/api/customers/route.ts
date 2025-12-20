import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { customerSchema, validateInput } from '@/lib/validation';
import { logActivity } from '@/lib/activity-logger';

// GET /api/customers - list customers
export async function GET(req: Request) {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);

  // Get visibility filter based on user's scope (includes country filtering for salesScope)
  const { getVisibilityFilter } = await import('@/lib/rbac');
  const visibilityFilter = await getVisibilityFilter(prisma, auth, 'customer', 'all');

  const customers = await prisma.customer.findMany({
    where: visibilityFilter,
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
      currency: true,
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
  
  // Check permission - allow admin or users with salesScope
  const { hasPermission } = await import('@/lib/rbac');
  const canCreate = auth.role === 'admin' || auth.salesScope === 'export_sales' || auth.salesScope === 'domestic_sales';
  if (!canCreate || !auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Enforce country restriction based on salesScope
  if (auth.salesScope === 'domestic_sales' && body.country !== 'India') {
    return NextResponse.json(
      { error: 'Domestic Sales users can only create companies for India' },
      { status: 403 }
    );
  }
  if (auth.salesScope === 'export_sales' && body.country === 'India') {
    return NextResponse.json(
      { error: 'Export Sales users can only create companies for countries other than India' },
      { status: 403 }
    );
  }

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
    currency: body.currency,
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

  // Set default currency for non-India customers if not provided
  let currencyValue = validatedData.currency;
  if (!currencyValue && validatedData.country !== 'India') {
    currencyValue = 'USD'; // Default to USD for export customers
  }

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
      currency: currencyValue,
    },
  });

  // Log activity: customer created
  await logActivity({
    prisma,
    module: 'CUST',
    entityType: 'customer',
    entityId: customer.id,
    srplId: (customer as any).srplId || undefined,
    action: 'create',
    description: `Customer created: ${customer.companyName}`,
    metadata: {
      customerType: customer.customerType,
      country: customer.country,
    },
    performedById: auth.userId,
  });

  return NextResponse.json(customer, { status: 201 });
}


