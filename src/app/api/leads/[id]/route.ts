import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { leadUpdateSchema, validateInput } from '@/lib/validation';

type Params = {
  params: { id: string };
};

// GET /api/leads/[id] - fetch a single lead
export async function GET(_req: Request, { params }: Params) {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      owner: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
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
    // Validate and sanitize incoming data (all fields optional on update)
    const validation = validateInput(leadUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const data = validation.data as any;

    // Only allow updating specific fields by default: status, followUpDate, productInterest, application, monthlyRequirement
    const updateData: any = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.followUpDate !== undefined) {
      updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
    }
    if (data.productInterest !== undefined) updateData.productInterest = data.productInterest;
    if (data.application !== undefined) updateData.application = data.application;
    if (data.monthlyRequirement !== undefined) updateData.monthlyRequirement = data.monthlyRequirement;

    // Allow full update if explicitly requested (for admin/initial creation)
    if (body.allowFullUpdate && isRoleAllowed(auth.role, ['admin'])) {
      if (data.companyName !== undefined) updateData.companyName = data.companyName;
      if (data.contactName !== undefined) updateData.contactName = data.contactName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.country !== undefined) updateData.country = data.country;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.gstNo !== undefined) updateData.gstNo = data.gstNo;
      if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
      if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
      if (data.source !== undefined) updateData.source = data.source;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
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

// DELETE /api/leads/[id] - delete a lead (admin only)
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();

  try {
    await prisma.lead.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lead', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}

