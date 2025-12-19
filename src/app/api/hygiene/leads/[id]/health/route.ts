import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { calculateLeadHealth } from '@/lib/data-hygiene';

type Params = {
  params: { id: string };
};

/**
 * GET /api/hygiene/leads/[id]/health
 * Get health score for a specific lead
 */
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const prisma = await getPrismaClient();
    const health = await calculateLeadHealth(prisma, params.id);

    return NextResponse.json(health);
  } catch (error) {
    console.error('Failed to calculate lead health:', error);
    if (error instanceof Error && error.message === 'Lead not found') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to calculate lead health', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

