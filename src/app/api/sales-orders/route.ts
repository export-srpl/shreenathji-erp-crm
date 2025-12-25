import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { logActivity } from '@/lib/activity-logger';
import { capturePriceHistory } from '@/lib/price-history';

// GET /api/sales-orders - list sales orders with customer and items
export async function GET() {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const orders = await prisma.salesOrder.findMany({
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(orders);
}

// POST /api/sales-orders - create a new sales order with line items
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  const orderNumber =
    body.orderNumber && body.orderNumber.length > 0
      ? body.orderNumber
      : `SO-${Date.now()}`;

  const order = await prisma.salesOrder.create({
    data: {
      orderNumber,
      status: body.status ?? 'Draft',
      orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
      expectedShip: body.expectedShip ? new Date(body.expectedShip) : null,
      notes: body.notes,
      customerId: body.customerId,
      quoteId: body.quoteId ?? null,
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
    include: { items: { include: { product: true } }, customer: true },
  });

  // Log activity: sales order created
  await logActivity({
    prisma,
    module: 'SO',
    entityType: 'sales_order',
    entityId: order.id,
    srplId: order.srplId || null,
    action: 'create',
    description: `Sales Order ${order.orderNumber} created for ${order.customer.companyName}`,
    metadata: {
      orderNumber: order.orderNumber,
      status: order.status,
      customerId: order.customerId,
      itemCount: order.items.length,
    },
    performedById: auth.userId || null,
  });

  // Capture price history
  await capturePriceHistory({
    prisma,
    documentType: 'SalesOrder',
    documentId: order.id,
    documentNo: order.orderNumber,
    documentDate: order.orderDate,
    customerId: order.customerId,
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
    })),
    currency: order.customer.currency || 'INR',
  });

  // Invalidate dispatch register cache
  try {
    const { invalidateDispatchCache } = await import('@/app/api/dispatch-register/route');
    invalidateDispatchCache();
  } catch (error) {
    // Best-effort cache invalidation
    console.warn('Failed to invalidate dispatch cache:', error);
  }

  return NextResponse.json(order, { status: 201 });
}


