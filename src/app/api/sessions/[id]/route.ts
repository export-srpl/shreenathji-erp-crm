import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { terminateSession } from '@/lib/session-manager';
import { logAudit } from '@/lib/audit-logger';

type Params = {
  params: { id: string };
};

/**
 * DELETE /api/sessions/[id]
 * Terminate a specific session
 * Users can terminate their own sessions, admins can terminate any session
 */
export async function DELETE(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = await getPrismaClient();

    // Check if session exists and belongs to user (or user is admin)
    const session = await prisma.session.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Users can only delete their own sessions, unless they're admin
    if (session.userId !== auth.userId && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get IP address and user agent for audit log
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      null;
    const userAgent = req.headers.get('user-agent') || null;

    // Terminate session
    const deleted = await terminateSession(prisma, params.id, session.userId);

    if (deleted) {
      // Log audit entry
      await logAudit(prisma, {
        userId: auth.userId,
        action: 'session_terminated',
        resource: 'session',
        resourceId: params.id,
        details: {
          terminatedSessionUserId: session.userId,
          terminatedSessionDevice: session.device,
          terminatedSessionLocation: session.city || session.country,
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to terminate session' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to terminate session:', error);
    return NextResponse.json(
      {
        error: 'Failed to terminate session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

