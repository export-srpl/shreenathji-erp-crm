import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getProductDemand } from '@/lib/product-analytics';

/**
 * GET /api/analytics/products/demand
 * Returns product-wise demand aggregation across Leads, Deals, Quotes, SO, Invoices
 * Query params:
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 *   - customerType: 'domestic' | 'international'
 *   - salesRepId: string
 *   - productId: string (optional, to filter single product)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const prisma = await getPrismaClient();

    const filters: any = {};

    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }
    if (searchParams.get('customerType')) {
      filters.customerType = searchParams.get('customerType') as 'domestic' | 'international';
    }
    if (searchParams.get('salesRepId')) {
      filters.salesRepId = searchParams.get('salesRepId')!;
    }
    if (searchParams.get('productId')) {
      filters.productId = searchParams.get('productId')!;
    }

    const data = await getProductDemand(prisma, filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch product demand analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product demand analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

