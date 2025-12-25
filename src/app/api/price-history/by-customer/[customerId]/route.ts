import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { customerId: string };
};

/**
 * GET /api/price-history/by-customer/[customerId]
 * Returns price history for all products sold to a specific customer
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - documentType: 'Quote' | 'ProformaInvoice' | 'SalesOrder' | 'Invoice' (optional)
 *   - productId: string (optional, filter by product)
 */
export async function GET(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const documentType = searchParams.get('documentType');
    const productId = searchParams.get('productId');

    const prisma = await getPrismaClient();

    const where: any = {
      customerId: params.customerId,
    };

    if (startDateParam || endDateParam) {
      where.documentDate = {};
      if (startDateParam) {
        where.documentDate.gte = new Date(startDateParam);
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
        where.documentDate.lte = endDate;
      }
    }

    if (documentType) {
      where.documentType = documentType;
    }

    if (productId) {
      where.productId = productId;
    }

    const priceHistory = await prisma.priceHistory.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            srplId: true,
          },
        },
        customer: {
          select: {
            id: true,
            companyName: true,
            srplId: true,
          },
        },
      },
      orderBy: {
        documentDate: 'desc',
      },
    });

    return NextResponse.json({
      data: priceHistory,
      count: priceHistory.length,
    });
  } catch (error) {
    console.error('Failed to fetch price history by customer:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch price history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

