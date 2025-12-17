import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import bcrypt from 'bcryptjs';

type Params = {
  params: { id: string };
};

// PATCH /api/users/[id]/profile - Update user profile (name, password, avatar)
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  
  // Users can only update their own profile, or admins can update any profile
  if (!auth.userId || (auth.userId !== params.id && !isRoleAllowed(auth.role, ['admin']))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();
  const { name, password, avatarUrl } = body as {
    name?: string;
    password?: string;
    avatarUrl?: string;
  };

  try {
    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: {
      name?: string | null;
      passwordHash?: string;
      avatarUrl?: string | null;
    } = {};

    if (name !== undefined) updateData.name = name || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
      }
      // Note: In a real implementation, you'd verify the current password first.
      // For now, we'll allow password change if the user is authenticated.
      // You can add a 'currentPassword' field to verify it matches existing.passwordHash
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

