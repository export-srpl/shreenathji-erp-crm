import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

// GET /api/products - list products
export async function GET() {
  const prisma = await getPrismaClient();
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(products);
}

// POST /api/products - create a new product
export async function POST(req: Request) {
  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  const product = await prisma.product.create({
    data: {
      name: body.productName ?? body.name,
      sku: body.sku,
      description: body.description,
      unitPrice: body.unitPrice ?? body.rate ?? 0,
      currency: body.currency ?? 'INR',
      stockQty: body.stockQty ?? 0,
    },
  });

  return NextResponse.json(product, { status: 201 });
}


