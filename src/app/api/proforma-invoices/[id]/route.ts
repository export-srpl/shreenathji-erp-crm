import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

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
    // Load existing proforma for diffing
    const existing = await prisma.proformaInvoice.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Proforma invoice not found' }, { status: 404 });
    }

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

    // Determine key changes for activity log
    const changes: Record<string, { old: any; new: any }> = {};
    if (body.status !== undefined && body.status !== existing.status) {
      changes.status = { old: existing.status, new: body.status };
    }

    // Log activity: proforma invoice updated
    await logActivity({
      prisma,
      module: 'PI',
      entityType: 'proforma_invoice',
      entityId: params.id,
      srplId: existing.srplId || null,
      action: Object.keys(changes).includes('status') ? 'stage_change' : 'update',
      field: Object.keys(changes).includes('status') ? 'status' : null,
      oldValue: Object.keys(changes).includes('status') ? changes.status.old : null,
      newValue: Object.keys(changes).includes('status') ? changes.status.new : null,
      description: Object.keys(changes).includes('status')
        ? `Proforma Invoice status changed from "${changes.status.old}" to "${changes.status.new}"`
        : `Proforma Invoice ${existing.proformaNumber} updated`,
      metadata: {
        proformaNumber: existing.proformaNumber,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        itemCount: updated.items.length,
      },
      performedById: auth.userId || null,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update proforma invoice' }, { status: 500 });
  }
}


