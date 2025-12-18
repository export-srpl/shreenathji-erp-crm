import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { quoteUpdateSchema, validateInput } from '@/lib/validation';

type Params = {
  params: { id: string };
};

// GET /api/quotes/[id]
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } }, customer: true, lead: true, salesRep: true },
  });

  if (!quote) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(quote);
}

// PATCH /api/quotes/[id]
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const rawBody = await req.json();

  // Normalize and validate input
  const normalized = {
    status: rawBody.status,
    notes: rawBody.notes,
    items: Array.isArray(rawBody.items)
      ? rawBody.items.map((item: any) => ({
          productId: item.productId,
          quantity: Number(item.quantity ?? item.qty ?? 0),
          unitPrice: Number(item.unitPrice ?? item.rate ?? 0),
          discountPct: item.discountPct ?? 0,
        }))
      : undefined,
  };

  const validation = validateInput(quoteUpdateSchema, normalized);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      },
      { status: 400 },
    );
  }

  const data = validation.data;

  try {
    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: {
        status: data.status,
        notes: data.notes,
        items: data.items
          ? {
              deleteMany: { quoteId: params.id },
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPct: item.discountPct ?? 0,
              })),
            }
          : undefined,
      },
      include: { items: { include: { product: true } }, customer: true, lead: true, salesRep: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}


