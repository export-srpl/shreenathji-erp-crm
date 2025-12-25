import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { id: string };
};

/**
 * DELETE /api/security/sessions/[id]
 * Terminate a specific session
 */
export async function DELETE(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const prisma = await getPrismaClient();

    // Verify the session belongs to the current user
    const session = await prisma.session.findUnique({
      where: { id: params.id },
      select: { userId: true, token: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if this is the current session
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const sessionCookie = cookieStore.get('app_session');
    const isCurrentSession = session.token === sessionCookie?.value;

    // Delete the session
    await prisma.session.delete({
      where: { id: params.id },
    });

    // If this was the current session, return a special flag
    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully',
      wasCurrentSession: isCurrentSession,
    });
  } catch (error: any) {
    console.error('Failed to terminate session:', error);
    return NextResponse.json(
      { error: 'Failed to terminate session', details: error.message },
      { status: 500 }
    );
  }
}

