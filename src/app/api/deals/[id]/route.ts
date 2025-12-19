import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { dealUpdateSchema, validateInput } from '@/lib/validation';
import { logActivity } from '@/lib/activity-logger';
import { runAutomationRules } from '@/lib/automation-engine';

type Params = {
  params: { id: string };
};

// GET /api/deals/[id] - get a single deal
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  return NextResponse.json(deal);
}

// PATCH /api/deals/[id] - update a deal
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const rawBody = await req.json();

  // Load existing deal for diffing
  const existing = await prisma.deal.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  const validation = validateInput(dealUpdateSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      },
      { status: 400 },
    );
  }

  const { title, stage, customerId, items } = validation.data;

  try {
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (stage !== undefined) updateData.stage = stage;
    if (customerId !== undefined) updateData.customerId = customerId;

    if (items !== undefined) {
      // Delete existing items and create new ones
      await prisma.dealItem.deleteMany({ where: { dealId: params.id } });
      updateData.items = {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };
    }

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Determine key changes for activity log
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (title !== undefined && title !== existing.title) {
      changes.title = { old: existing.title, new: title };
    }
    if (stage !== undefined && stage !== existing.stage) {
      changes.stage = { old: existing.stage, new: stage };
    }
    if (customerId !== undefined && customerId !== existing.customerId) {
      changes.customerId = { old: existing.customerId, new: customerId };
    }
    if (items !== undefined) {
      changes.items = { old: 'updated', new: `items:${items.length}` };
    }

    if (Object.keys(changes).length > 0) {
      const changedFields = Object.keys(changes).join(', ');
      await logActivity({
        prisma,
        module: 'DEAL',
        entityType: 'deal',
        entityId: deal.id,
        srplId: (deal as any).srplId || undefined,
        action: changes.stage ? 'stage_change' : 'update',
        description: `Deal updated (${changedFields})`,
        metadata: { changes },
        performedById: auth.userId,
      });

      await runAutomationRules({
        prisma,
        module: 'DEAL',
        triggerType: changes.stage ? 'on_stage_change' : 'on_update',
        entityType: 'deal',
        entityId: deal.id,
        current: deal as any,
        previous: existing as any,
        performedById: auth.userId,
      });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error('Failed to update deal:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

// DELETE /api/deals/[id] - delete a deal
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();

  try {
    await prisma.deal.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete deal:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}

