import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

type Params = {
  params: { id: string };
};

// GET /api/sales-orders/[id]
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();
  const order = await prisma.salesOrder.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } }, customer: true, quote: true, salesRep: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
  }

  return NextResponse.json(order);
}

// PATCH /api/sales-orders/[id]
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  try {
    // Load existing order for diffing
    const existing = await prisma.salesOrder.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.expectedShip !== undefined) {
      updateData.expectedShip = body.expectedShip ? new Date(body.expectedShip) : null;
    }
    if (body.incoTerms !== undefined) updateData.incoTerms = body.incoTerms;
    if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms;
    if (body.poNumber !== undefined) updateData.poNumber = body.poNumber;
    if (body.poDate !== undefined) updateData.poDate = body.poDate ? new Date(body.poDate) : null;
    if (body.salesRepId !== undefined) updateData.salesRepId = body.salesRepId;
    if (body.items !== undefined) {
      updateData.items = {
        deleteMany: { salesOrderId: params.id },
        create: body.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity ?? item.qty,
          unitPrice: item.unitPrice ?? item.rate,
          discountPct: item.discountPct ?? 0,
        })),
      };
    }

    const updated = await prisma.salesOrder.update({
      where: { id: params.id },
      data: updateData,
      include: { items: { include: { product: true } }, customer: true, quote: true, salesRep: true },
    });

    // Determine key changes for activity log
    const changes: Record<string, { old: any; new: any }> = {};
    if (body.status !== undefined && body.status !== existing.status) {
      changes.status = { old: existing.status, new: body.status };
    }

    // Log activity: sales order updated
    await logActivity({
      prisma,
      module: 'SO',
      entityType: 'sales_order',
      entityId: params.id,
      srplId: existing.srplId || null,
      action: Object.keys(changes).includes('status') ? 'stage_change' : 'update',
      field: Object.keys(changes).includes('status') ? 'status' : null,
      oldValue: Object.keys(changes).includes('status') ? changes.status.old : null,
      newValue: Object.keys(changes).includes('status') ? changes.status.new : null,
      description: Object.keys(changes).includes('status')
        ? `Sales Order status changed from "${changes.status.old}" to "${changes.status.new}"`
        : `Sales Order ${existing.orderNumber} updated`,
      metadata: {
        orderNumber: existing.orderNumber,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        itemCount: updated.items.length,
      },
      performedById: auth.userId || null,
    });

    // Invalidate dispatch register cache if items or status changed
    try {
      const { invalidateDispatchCache } = await import('@/app/api/dispatch-register/route');
      invalidateDispatchCache();
    } catch (error) {
      // Best-effort cache invalidation
      console.warn('Failed to invalidate dispatch cache:', error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update sales order' }, { status: 500 });
  }
}
