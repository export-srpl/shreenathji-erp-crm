import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { calculateSalespersonPerformance } from '@/lib/reporting';

/**
 * GET /api/reports/performance
 * Get salesperson performance metrics
 * Query params: startDate?, endDate?, salesRepIds? (comma-separated)
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
    if (searchParams.get('salesRepIds')) {
      filters.salesRepIds = searchParams.get('salesRepIds')!.split(',');
    }

    const data = await calculateSalespersonPerformance(prisma, filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to calculate salesperson performance:', error);
    return NextResponse.json(
      { error: 'Failed to calculate salesperson performance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

