import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/products/document-status
 * Get document availability status (TDS, MSDS, COA) for multiple products
 * Query params: productIds (comma-separated)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const productIdsParam = searchParams.get('productIds');
    
    if (!productIdsParam) {
      return NextResponse.json({ error: 'productIds parameter is required' }, { status: 400 });
    }

    const productIds = productIdsParam.split(',').filter(id => id.trim());

    if (productIds.length === 0) {
      return NextResponse.json({});
    }

    const prisma = await getPrismaClient();
    const p: any = prisma;

    // Fetch documents for all products in one query
    const documents = await p.document.findMany({
      where: {
        productId: { in: productIds },
        type: { in: ['TDS', 'MSDS', 'COA'] },
      },
      select: {
        productId: true,
        type: true,
      },
    });

    // Build status map: { productId: { TDS: true, MSDS: true, COA: false } }
    const statusMap: Record<string, { TDS: boolean; MSDS: boolean; COA: boolean }> = {};

    // Initialize all products with false
    productIds.forEach((id: string) => {
      statusMap[id] = { TDS: false, MSDS: false, COA: false };
    });

    // Mark available documents
    documents.forEach((doc: { productId: string; type: string }) => {
      if (statusMap[doc.productId] && ['TDS', 'MSDS', 'COA'].includes(doc.type)) {
        statusMap[doc.productId][doc.type as 'TDS' | 'MSDS' | 'COA'] = true;
      }
    });

    return NextResponse.json(statusMap);
  } catch (error) {
    console.error('Failed to fetch document status:', error);
    return NextResponse.json({ error: 'Failed to fetch document status' }, { status: 500 });
  }
}

