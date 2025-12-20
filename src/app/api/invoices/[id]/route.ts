import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { invoiceUpdateSchema, validateInput } from '@/lib/validation';
import { logActivity } from '@/lib/activity-logger';

type Params = {
  params: { id: string };
};

// GET /api/invoices/[id]
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } }, customer: true, salesOrder: true, proforma: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

// PATCH /api/invoices/[id]
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'finance'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const rawBody = await req.json();

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

  const validation = validateInput(invoiceUpdateSchema, normalized);
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
    // Load existing invoice for diffing
    const existing = await prisma.invoice.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: data.status,
        notes: data.notes,
        items: data.items
          ? {
              deleteMany: { invoiceId: params.id },
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPct: item.discountPct ?? 0,
              })),
            }
          : undefined,
      },
      include: { items: { include: { product: true } }, customer: true, salesOrder: true, proforma: true },
    });

    // Determine key changes for activity log
    const changes: Record<string, { old: any; new: any }> = {};
    if (data.status !== undefined && data.status !== existing.status) {
      changes.status = { old: existing.status, new: data.status };
    }

    // Log activity: invoice updated
    await logActivity({
      prisma,
      module: 'INV',
      entityType: 'invoice',
      entityId: params.id,
      srplId: existing.srplId || null,
      action: Object.keys(changes).includes('status') ? 'stage_change' : 'update',
      field: Object.keys(changes).includes('status') ? 'status' : null,
      oldValue: Object.keys(changes).includes('status') ? changes.status.old : null,
      newValue: Object.keys(changes).includes('status') ? changes.status.new : null,
      description: Object.keys(changes).includes('status')
        ? `Invoice status changed from "${changes.status.old}" to "${changes.status.new}"`
        : `Invoice ${existing.invoiceNumber} updated`,
      metadata: {
        invoiceNumber: existing.invoiceNumber,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        itemCount: updated.items.length,
      },
      performedById: auth.userId || null,
    });

    // Invalidate dispatch register cache if items changed
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
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}


