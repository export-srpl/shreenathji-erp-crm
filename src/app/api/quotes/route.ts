import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { logActivity } from '@/lib/activity-logger';
import { capturePriceHistory } from '@/lib/price-history';

// GET /api/quotes - list quotes with customer and items
export async function GET() {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

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
      incoTerms: body.incoTerms ?? null,
      paymentTerms: body.paymentTerms ?? null,
      poNumber: body.poNumber ?? null,
      poDate: body.poDate ? new Date(body.poDate) : null,
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

  // Log activity: quote created
  await logActivity({
    prisma,
    module: 'QUOTE',
    entityType: 'quote',
    entityId: quote.id,
    srplId: quote.srplId || null,
    action: 'create',
    description: `Quote ${quote.quoteNumber} created for ${quote.customer.companyName}`,
    metadata: {
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      customerId: quote.customerId,
      itemCount: quote.items.length,
    },
    performedById: auth.userId || null,
  });

  // Capture price history
  await capturePriceHistory({
    prisma,
    documentType: 'Quote',
    documentId: quote.id,
    documentNo: quote.quoteNumber,
    documentDate: quote.issueDate,
    customerId: quote.customerId,
    items: quote.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
    })),
    currency: quote.customer.currency || 'INR',
  });

  return NextResponse.json(quote, { status: 201 });
}


