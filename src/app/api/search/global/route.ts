import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { globalSearch, getQuickActions } from '@/lib/global-search';

/**
 * GET /api/search/global
 * Global search across all entities
 * Query params: q (search query), limit?, entityTypes? (comma-separated)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const entityTypesParam = searchParams.get('entityTypes');
    const entityTypes = entityTypesParam ? entityTypesParam.split(',') : undefined;

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        quickActions: getQuickActions(query),
      });
    }

    const prisma = await getPrismaClient();
    const auth = await getAuthContext(req);

    const results = await globalSearch(prisma, query, {
      limit,
      entityTypes,
      userId: auth.userId || undefined,
    });

    const quickActions = getQuickActions(query);

    return NextResponse.json({
      results,
      quickActions,
    });
  } catch (error) {
    console.error('Failed to perform global search:', error);
    return NextResponse.json(
      { error: 'Failed to perform search', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

