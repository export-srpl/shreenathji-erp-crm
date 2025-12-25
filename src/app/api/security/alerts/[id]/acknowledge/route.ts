import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

/**
 * POST /api/security/alerts/[id]/acknowledge
 * Acknowledge a security alert (admin only)
 */
export async function POST(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();

    const alert = await prisma.securityAlert.update({
      where: { id: params.id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedById: auth.userId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        acknowledgedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    return NextResponse.json(
      {
        error: 'Failed to acknowledge alert',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

