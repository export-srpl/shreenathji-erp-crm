import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { calculateSalesCycleMetrics } from '@/lib/reporting';

/**
 * GET /api/reports/sales-cycle
 * Get sales cycle duration metrics
 * Query params: startDate?, endDate?, salesRepId?
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
    if (searchParams.get('salesRepId')) {
      filters.salesRepId = searchParams.get('salesRepId')!;
    }

    const data = await calculateSalesCycleMetrics(prisma, filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to calculate sales cycle metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate sales cycle metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

