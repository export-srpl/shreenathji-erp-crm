import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

// GET /api/payments - list payments with related order
export async function GET() {
  const prisma = await getPrismaClient();
  const payments = await prisma.payment.findMany({
    include: { salesOrder: true },
    orderBy: { paymentDate: 'desc' },
  });

  return NextResponse.json(payments);
}

// POST /api/payments - create a new payment
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'finance'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  const payment = await prisma.payment.create({
    data: {
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      amount: body.amount,
      method: body.method ?? body.paymentMethod,
      referenceNo: body.referenceNo ?? body.transactionId,
      notes: body.notes,
      salesOrderId: body.salesOrderId ?? body.orderId,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}


