import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

// GET /api/invoices - list invoices with customer
export async function GET() {
  const prisma = await getPrismaClient();
  const invoices = await prisma.invoice.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(invoices);
}

// POST /api/invoices - create a new invoice with line items
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'finance'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: body.invoiceNumber,
      status: body.status ?? 'Draft',
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      notes: body.notes,
      customerId: body.customerId,
      proformaId: body.proformaId ?? null,
      salesOrderId: body.salesOrderId ?? null,
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
    include: { items: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}


