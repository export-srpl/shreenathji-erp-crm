import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

// GET /api/deals - list all deals
export async function GET() {
  const prisma = await getPrismaClient();
  const deals = await prisma.deal.findMany({
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(deals);
}

// POST /api/deals - create a new deal
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();
  const { title, stage, customerId, items } = body as {
    title: string;
    stage: string;
    customerId: string;
    items: Array<{ productId: string; quantity: number }>;
  };

  if (!title || !customerId || !items || items.length === 0) {
    return NextResponse.json({ error: 'Title, customer, and at least one product are required' }, { status: 400 });
  }

  try {
    const deal = await prisma.deal.create({
      data: {
        title,
        stage: stage || 'Prospecting',
        customerId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error('Failed to create deal:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}

