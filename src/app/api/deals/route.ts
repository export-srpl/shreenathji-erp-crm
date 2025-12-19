import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { logActivity } from '@/lib/activity-logger';
import { runAutomationRules } from '@/lib/automation-engine';

// GET /api/deals - list all deals
export async function GET() {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const prisma = await getPrismaClient();
    const deals = await prisma.deal.findMany({
      select: {
        id: true,
        title: true,
        stage: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            companyName: true,
          },
        },
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(deals);
  } catch (error) {
    console.error('Failed to fetch deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/deals - create a new deal
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();
  const { title, stage, customerId, items } = body as {
    title: string;
    stage: string;
    customerId: string;
    items: Array<{ productId: string; quantity: number }>;
  };

  if (!title || !customerId || !items || items.length === 0) {
    return NextResponse.json({ error: 'Title, customer, and at least one product are required' }, { status: 400 });
  }

  try {
    const deal = await prisma.deal.create({
      data: {
        title,
        stage: stage || 'Prospecting',
        customerId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Log activity: deal created
    await logActivity({
      prisma,
      module: 'DEAL',
      entityType: 'deal',
      entityId: deal.id,
      srplId: (deal as any).srplId || undefined,
      action: 'create',
      description: `Deal created: ${deal.title}`,
      metadata: {
        customerId,
        stage: deal.stage,
        itemCount: items.length,
      },
      performedById: auth.userId,
    });

    await runAutomationRules({
      prisma,
      module: 'DEAL',
      triggerType: 'on_create',
      entityType: 'deal',
      entityId: deal.id,
      current: deal as any,
      previous: null,
      performedById: auth.userId,
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error('Failed to create deal:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}

