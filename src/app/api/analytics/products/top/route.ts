import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getTopProducts } from '@/lib/product-analytics';

/**
 * GET /api/analytics/products/top
 * Returns top products by revenue, quantity, or conversion rate
 * Query params:
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 *   - customerType: 'domestic' | 'international'
 *   - salesRepId: string
 *   - limit: number (default: 10)
 *   - sortBy: 'revenue' | 'quantity' | 'conversion' (default: 'revenue')
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
    if (searchParams.get('limit')) {
      filters.limit = parseInt(searchParams.get('limit')!, 10);
    }
    if (searchParams.get('sortBy')) {
      filters.sortBy = searchParams.get('sortBy') as 'revenue' | 'quantity' | 'conversion';
    }

    const data = await getTopProducts(prisma, filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch top products analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top products analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

