import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { productId: string };
};

/**
 * GET /api/documents/by-product/[productId]
 * Get all documents linked to a specific product
 */
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const prisma = await getPrismaClient();
    const p: any = prisma;

    const documents = await p.document.findMany({
      where: {
        productId: params.productId,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        product: {
          select: { id: true, name: true, srplId: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to fetch product documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

