import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { calculateWeightedPipeline } from '@/lib/reporting';

/**
 * GET /api/reports/pipeline/weighted
 * Get weighted pipeline value
 * Query params: pipelineId?, salesRepId?, startDate?, endDate?
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const prisma = await getPrismaClient();

    const filters: any = {};
    if (searchParams.get('pipelineId')) {
      filters.pipelineId = searchParams.get('pipelineId')!;
    }
    if (searchParams.get('salesRepId')) {
      filters.salesRepId = searchParams.get('salesRepId')!;
    }
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }

    const data = await calculateWeightedPipeline(prisma, filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to calculate weighted pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to calculate weighted pipeline', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

