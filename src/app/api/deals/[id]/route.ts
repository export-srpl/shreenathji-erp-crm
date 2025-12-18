import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

// GET /api/deals/[id] - get a single deal
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  return NextResponse.json(deal);
}

// PATCH /api/deals/[id] - update a deal
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();
  const { title, stage, customerId, items } = body as {
    title?: string;
    stage?: string;
    customerId?: string;
    items?: Array<{ productId: string; quantity: number }>;
  };

  try {
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (stage !== undefined) updateData.stage = stage;
    if (customerId !== undefined) updateData.customerId = customerId;

    if (items !== undefined) {
      // Delete existing items and create new ones
      await prisma.dealItem.deleteMany({ where: { dealId: params.id } });
      updateData.items = {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };
    }

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(deal);
  } catch (error) {
    console.error('Failed to update deal:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

// DELETE /api/deals/[id] - delete a deal
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();

  try {
    await prisma.deal.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete deal:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}

