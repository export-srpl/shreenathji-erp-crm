import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

// GET /api/proforma-invoices/[id]
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } }, customer: true, quote: true },
  });

  if (!proforma) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(proforma);
}

// PATCH /api/proforma-invoices/[id]
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  try {
    const updated = await prisma.proformaInvoice.update({
      where: { id: params.id },
      data: {
        status: body.status,
        notes: body.notes,
        items: body.items
          ? {
              deleteMany: { proformaId: params.id },
              create: body.items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity ?? item.qty,
                unitPrice: item.unitPrice ?? item.rate,
                discountPct: item.discountPct ?? 0,
              })),
            }
          : undefined,
      },
      include: { items: { include: { product: true } }, customer: true, quote: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update proforma invoice' }, { status: 500 });
  }
}


