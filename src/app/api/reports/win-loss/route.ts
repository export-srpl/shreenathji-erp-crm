import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { analyzeWinLoss } from '@/lib/reporting';

/**
 * GET /api/reports/win-loss
 * Get win-loss analysis
 * Query params: startDate?, endDate?, salesRepId?, pipelineId?
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
    if (searchParams.get('pipelineId')) {
      filters.pipelineId = searchParams.get('pipelineId')!;
    }

    const data = await analyzeWinLoss(prisma, filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to analyze win-loss:', error);
    return NextResponse.json(
      { error: 'Failed to analyze win-loss', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

