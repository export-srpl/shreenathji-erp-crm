import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET /api/auth/me - Get current logged-in user from session
export async function GET() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('app_session');
  const userEmailCookie = cookieStore.get('user_email');

  // Check if user has a valid session
  if (!sessionCookie || sessionCookie.value !== 'valid') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get user by email from cookie
  if (!userEmailCookie?.value) {
    return NextResponse.json({ error: 'User email not found in session' }, { status: 401 });
  }

  const prisma = await getPrismaClient();
  const user = await prisma.user.findUnique({ 
    where: { email: userEmailCookie.value } 
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
  });
}

