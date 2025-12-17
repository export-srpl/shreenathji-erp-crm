import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

// GET /api/proforma-invoices - list proforma invoices with customer
export async function GET() {
  const prisma = await getPrismaClient();
  const proformas = await prisma.proformaInvoice.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(proformas);
}

// POST /api/proforma-invoices - create a new proforma invoice with line items
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  const proforma = await prisma.proformaInvoice.create({
    data: {
      proformaNumber: body.proformaNumber,
      status: body.status ?? 'Draft',
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      notes: body.notes,
      customerId: body.customerId,
      quoteId: body.quoteId ?? null,
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

  return NextResponse.json(proforma, { status: 201 });
}


