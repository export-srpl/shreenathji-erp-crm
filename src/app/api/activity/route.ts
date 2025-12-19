import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/activity?entityType=lead&entityId=...&cursor=...&limit=20
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const prisma = await getPrismaClient();
    const { searchParams } = new URL(req.url);

    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const cursor = searchParams.get('cursor');
    const limitParam = searchParams.get('limit');

    const take = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 100);

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 },
      );
    }

    const where = {
      entityType,
      entityId,
    };

    const p: any = prisma;

    const activities = await p.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1, // Fetch one extra to compute nextCursor
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      include: {
        performedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    let nextCursor: string | null = null;
    if (activities.length > take) {
      const nextItem = activities.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return NextResponse.json({
      items: activities,
      nextCursor,
    });
  } catch (error) {
    console.error('Failed to fetch activity timeline:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch activity timeline',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}


