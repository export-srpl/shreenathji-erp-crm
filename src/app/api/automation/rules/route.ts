import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/automation/rules - list all automation rules (admin only)
export async function GET(_req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json(rules);
}

// POST /api/automation/rules - create a new automation rule (admin only)
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, module, triggerType, condition, actions, isActive } = body;

    if (!name || !module || !triggerType || !actions) {
      return NextResponse.json(
        { error: 'name, module, triggerType, and actions are required' },
        { status: 400 },
      );
    }

    // Basic safety: ensure actions parses as JSON array
    try {
      const parsed = typeof actions === 'string' ? JSON.parse(actions) : actions;
      if (!Array.isArray(parsed)) {
        return NextResponse.json(
          { error: 'actions must be a JSON array' },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'actions must be valid JSON' },
        { status: 400 },
      );
    }

    const prisma = await getPrismaClient();

    const rule = await prisma.automationRule.create({
      data: {
        name,
        description: description ?? null,
        module,
        triggerType,
        isActive: isActive ?? true,
        condition: condition ? (typeof condition === 'string' ? condition : JSON.stringify(condition)) : null,
        actions: typeof actions === 'string' ? actions : JSON.stringify(actions),
        createdById: auth.userId,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Failed to create automation rule:', error);
    return NextResponse.json({ error: 'Failed to create automation rule' }, { status: 500 });
  }
}


