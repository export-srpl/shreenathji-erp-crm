import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { findStaleLeads } from '@/lib/data-hygiene';

/**
 * GET /api/hygiene/leads/stale
 * Find stale leads (no activity for N days)
 * Query params: days (default: 30), status (comma-separated)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const statusParam = searchParams.get('status');
    const status = statusParam ? statusParam.split(',') : undefined;

    const prisma = await getPrismaClient();
    const staleLeads = await findStaleLeads(prisma, days, status);

    return NextResponse.json({
      count: staleLeads.length,
      leads: staleLeads,
    });
  } catch (error) {
    console.error('Failed to find stale leads:', error);
    return NextResponse.json(
      { error: 'Failed to find stale leads', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

