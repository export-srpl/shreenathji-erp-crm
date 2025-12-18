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
  
  // SECURITY: Strict authorization check - users can only update their own profile, or admins can update any
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.userId !== params.id && !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden: You can only update your own profile' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();
  const { name, password, currentPassword, avatarUrl } = body as {
    name?: string;
    password?: string;
    currentPassword?: string;
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
    
    // SECURITY: Require current password verification for password changes
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
      }

      // Require current password for non-admin users
      if (!isRoleAllowed(auth.role, ['admin'])) {
        if (!currentPassword) {
          return NextResponse.json({ error: 'Current password is required to change password.' }, { status: 400 });
        }

        if (!existing.passwordHash) {
          return NextResponse.json({ error: 'No password set for this account.' }, { status: 400 });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existing.passwordHash);
        if (!isCurrentPasswordValid) {
          return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
        }

        // Prevent reusing the same password
        const isSamePassword = await bcrypt.compare(password, existing.passwordHash);
        if (isSamePassword) {
          return NextResponse.json({ error: 'New password must be different from current password.' }, { status: 400 });
        }
      }

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

