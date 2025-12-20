import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET /api/auth/me - Get current logged-in user from secure session
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('app_session');

  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const prisma = await getPrismaClient();

  // Look up session and user
  const session = await prisma.session.findUnique({
    where: { token: sessionCookie.value },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user) {
    // Clean up expired/invalid session if present
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Optionally refresh lastActivityAt here if desired
  try {
    const { updateSessionActivity } = await import('@/lib/session-timeout');
    await updateSessionActivity(session.token);
  } catch {
    // Best-effort; ignore errors
  }

  const user = session.user;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    is2FAEnabled: user.is2FAEnabled || false,
    salesScope: (user as any).salesScope || null,
  });
}
