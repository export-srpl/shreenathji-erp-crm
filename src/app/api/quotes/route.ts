import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

// GET /api/quotes - list quotes with customer and items
export async function GET() {
  const prisma = await getPrismaClient();
  const quotes = await prisma.quote.findMany({
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(quotes);
}

// POST /api/quotes - create a new quote with line items
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  const quoteNumber =
    body.quoteNumber && body.quoteNumber.length > 0
      ? body.quoteNumber
      : `Q-${Date.now()}`;

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      status: body.status ?? 'Draft',
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      notes: body.notes,
      customerId: body.customerId,
      leadId: body.leadId ?? null,
      salesRepId: body.salesRepId ?? null,
      items: body.items
        ? {
            create: body.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity ?? item.qty,
              unitPrice: item.unitPrice ?? item.rate,
              discountPct: item.discountPct ?? 0,
            })),
          }
        : undefined,
    },
    include: { items: { include: { product: true } }, customer: true, lead: true, salesRep: true },
  });

  return NextResponse.json(quote, { status: 201 });
}


