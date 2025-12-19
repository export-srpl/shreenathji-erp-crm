import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { calculateRevenueProjection } from '@/lib/reporting';

/**
 * GET /api/reports/revenue/projection
 * Get revenue projections
 * Query params: months? (default: 3), pipelineId?
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const prisma = await getPrismaClient();

    const filters: any = {};
    if (searchParams.get('months')) {
      filters.months = parseInt(searchParams.get('months')!, 10);
    }
    if (searchParams.get('pipelineId')) {
      filters.pipelineId = searchParams.get('pipelineId')!;
    }

    const data = await calculateRevenueProjection(prisma, filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to calculate revenue projection:', error);
    return NextResponse.json(
      { error: 'Failed to calculate revenue projection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

