import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { id: string };
};

// GET /api/automation/rules/[id]
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const rule = await prisma.automationRule.findUnique({
    where: { id: params.id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  return NextResponse.json(rule);
}

// PATCH /api/automation/rules/[id] - update an automation rule (admin only)
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, module, triggerType, condition, actions, isActive } = body;

    const prisma = await getPrismaClient();

    const existing = await prisma.automationRule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (module !== undefined) data.module = module;
    if (triggerType !== undefined) data.triggerType = triggerType;
    if (isActive !== undefined) data.isActive = isActive;
    if (condition !== undefined) {
      data.condition = condition ? (typeof condition === 'string' ? condition : JSON.stringify(condition)) : null;
    }
    if (actions !== undefined) {
      try {
        const parsed = typeof actions === 'string' ? JSON.parse(actions) : actions;
        if (!Array.isArray(parsed)) {
          return NextResponse.json(
            { error: 'actions must be a JSON array' },
            { status: 400 },
          );
        }
        data.actions = typeof actions === 'string' ? actions : JSON.stringify(actions);
      } catch {
        return NextResponse.json(
          { error: 'actions must be valid JSON' },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.automationRule.update({
      where: { id: params.id },
      data,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update automation rule:', error);
    return NextResponse.json({ error: 'Failed to update automation rule' }, { status: 500 });
  }
}

// DELETE /api/automation/rules/[id] - delete an automation rule (admin only)
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();

    await prisma.automationRule.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete automation rule:', error);
    return NextResponse.json({ error: 'Failed to delete automation rule' }, { status: 500 });
  }
}


