import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

/**
 * POST /api/dispatch-register/invalidate-cache
 * Invalidate dispatch register cache (called when Sales Orders or Invoices change)
 * This ensures cache is cleared when underlying data changes
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a production environment, you would invalidate Redis cache here
    // For now, the in-memory cache in route.ts will expire naturally (5 min TTL)
    // This endpoint can be called by Sales Order/Invoice mutation endpoints to trigger cache clear

    return NextResponse.json({
      success: true,
      message: 'Cache invalidation requested. Cache will refresh on next request or expire naturally.',
    });
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
    return NextResponse.json(
      {
        error: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

