import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { customerUpdateSchema, validateInput } from '@/lib/validation';

type Params = {
  params: { id: string };
};

// GET /api/customers/[id] - fetch a single customer
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Failed to fetch customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

// PATCH /api/customers/[id] - update an existing customer
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  try {
    const validation = validateInput(customerUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 },
      );
    }

    const data = validation.data as any;

    const updateData: any = {};
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.customerType !== undefined) updateData.customerType = data.customerType;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.gstNo !== undefined) updateData.gstNo = data.gstNo;
    if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
    if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.contactTitle !== undefined) updateData.contactTitle = data.contactTitle;
    if (data.currency !== undefined) updateData.currency = data.currency;

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// DELETE /api/customers/[id] - delete a customer
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  try {
    const prisma = await getPrismaClient();
    // Soft delete: set isActive = false instead of hard delete
    const updated = await prisma.customer.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });

    return NextResponse.json({ success: true, isActive: updated.isActive });
  } catch (error: any) {
    console.error('Failed to delete customer:', error);

    // Handle referential integrity / foreign key constraint errors gracefully
    if (error.code === 'P2003') {
      // Prisma referential integrity error
      return NextResponse.json(
        {
          error: 'Cannot delete customer',
          details:
            'This company has related records (deals, quotes, sales orders, invoices, or documents). Delete or reassign those records before deleting this customer.',
          code: 'CUSTOMER_HAS_DEPENDENCIES',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete customer',
        details: error?.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}

