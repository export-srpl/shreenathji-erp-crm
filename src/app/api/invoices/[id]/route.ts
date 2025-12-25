import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { invoiceUpdateSchema, validateInput } from '@/lib/validation';
import { logActivity } from '@/lib/activity-logger';
import { capturePriceHistory } from '@/lib/price-history';
import { checkPricingApproval, isPendingApproval } from '@/lib/approval-integration';
import { logAudit } from '@/lib/audit-logger';

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
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Phase 4: Check if there's a pending approval request
    const pending = await isPendingApproval(
      prisma,
      'invoice',
      params.id,
      'update'
    );

    if (pending) {
      return NextResponse.json(
        {
          error: 'Pending approval required',
          message: 'This invoice has pending approval requests. Please wait for approval before making changes.',
        },
        { status: 403 }
      );
    }

    // Phase 4: Check for pricing/discount changes that require approval
    if (data.items && auth.userId) {
      const ipAddress = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        null;
      const userAgent = req.headers.get('user-agent') || null;

      const approvalCheck = await checkPricingApproval(prisma, {
        resource: 'invoice',
        resourceId: params.id,
        userId: auth.userId,
        items: data.items,
        existingItems: existing.items as any,
        ipAddress,
        userAgent,
      });

      if (approvalCheck.requiresApproval) {
        if (approvalCheck.error) {
          return NextResponse.json(
            {
              error: approvalCheck.error,
              approvalRequestId: approvalCheck.approvalRequestId,
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          {
            error: 'Approval required',
            message: 'This pricing/discount change requires approval before it can be applied.',
            approvalRequestId: approvalCheck.approvalRequestId,
            requiresApproval: true,
          },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: data.status,
        notes: data.notes,
        incoTerms: rawBody.incoTerms !== undefined ? rawBody.incoTerms : undefined,
        paymentTerms: rawBody.paymentTerms !== undefined ? rawBody.paymentTerms : undefined,
        poNumber: rawBody.poNumber !== undefined ? rawBody.poNumber : undefined,
        poDate: rawBody.poDate ? new Date(rawBody.poDate) : undefined,
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

    // Capture price history on update (only if items changed)
    if (data.items && updated.items.length > 0) {
      await capturePriceHistory({
        prisma,
        documentType: 'Invoice',
        documentId: updated.id,
        documentNo: updated.invoiceNumber,
        documentDate: updated.issueDate,
        customerId: updated.customerId,
        items: updated.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPct: item.discountPct,
        })),
        currency: updated.customer.currency || 'INR',
      });

      // Phase 4: Log audit entry for pricing changes
      const ipAddress = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        null;
      const userAgent = req.headers.get('user-agent') || null;

      // Check if there were actual price/discount changes
      const hasPricingChanges = existing.items.some((existingItem) => {
        const newItem = updated.items.find((item) => item.productId === existingItem.productId);
        if (!newItem) return true; // Item was added/removed
        return (
          Number(newItem.unitPrice) !== Number(existingItem.unitPrice) ||
          (newItem.discountPct || 0) !== (existingItem.discountPct || 0)
        );
      });

      if (hasPricingChanges && auth.userId) {
        await logAudit(prisma, {
          userId: auth.userId,
          action: 'pricing_updated',
          resource: 'invoice',
          resourceId: params.id,
          details: {
            invoiceNumber: updated.invoiceNumber,
            itemCount: updated.items.length,
            items: updated.items.map((item) => ({
              productId: item.productId,
              productName: item.product?.name,
              unitPrice: Number(item.unitPrice),
              discountPct: item.discountPct || 0,
            })),
          },
          ipAddress,
          userAgent,
        });
      }
    }

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


