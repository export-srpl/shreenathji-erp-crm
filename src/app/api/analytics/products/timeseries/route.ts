import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getProductTimeSeries } from '@/lib/product-analytics';

/**
 * GET /api/analytics/products/timeseries
 * Returns time-series product data (monthly or quarterly)
 * Query params:
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 *   - groupBy: 'month' | 'quarter' (default: 'month')
 *   - productId: string (optional)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const prisma = await getPrismaClient();

    const filters: any = {
      groupBy: (searchParams.get('groupBy') as 'month' | 'quarter') || 'month',
    };

    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }
    if (searchParams.get('productId')) {
      filters.productId = searchParams.get('productId')!;
    }

    const data = await getProductTimeSeries(prisma, filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch product time-series analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product time-series analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

