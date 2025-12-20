import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { userAdminUpdateSchema, validateInput } from '@/lib/validation';

type Params = {
  params: { id: string };
};

// GET /api/users/[id] - Get a single user
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();

  try {
    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email,
      role: user.role === 'admin' ? 'Admin' : (user.role === 'sales' ? 'Sales' : (user.role === 'finance' ? 'Finance' : 'User')),
      status: 'Active' as const,
      avatarUrl: undefined,
      moduleAccess: {},
      salesScope: (user as any).salesScope || null,
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const rawBody = await req.json();

  const validation = validateInput(userAdminUpdateSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      },
      { status: 400 },
    );
  }

  const { name, email, role, password, salesScope } = validation.data as any;

  try {
    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If email is being changed, validate domain
    if (email && email !== existing.email) {
      const normalisedEmail = email.trim().toLowerCase();
      const allowedDomain = 'shreenathjirasayan.com';
      if (!normalisedEmail.endsWith(`@${allowedDomain}`)) {
        return NextResponse.json(
          { error: `Only company emails (@${allowedDomain}) are allowed.` },
          { status: 400 },
        );
      }

      // Check if new email already exists
      const emailExists = await prisma.user.findUnique({ where: { email: normalisedEmail } });
      if (emailExists && emailExists.id !== params.id) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
    }

    const updateData: {
      name?: string | null;
      email?: string;
      role?: string;
      passwordHash?: string;
      salesScope?: string | null;
    } = {};

    if (name !== undefined) updateData.name = name || null;
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (role !== undefined) {
      updateData.role =
        role === 'Admin' ? 'admin' : role === 'Sales' ? 'sales' : role === 'Finance' ? 'finance' : 'user';
    }
    if (password) {
      const bcrypt = await import('bcryptjs');
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }
    if (salesScope !== undefined) {
      updateData.salesScope = salesScope || null;
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email,
      role: user.role === 'admin' ? 'Admin' : (user.role === 'sales' ? 'Sales' : (user.role === 'finance' ? 'Finance' : 'User')),
      status: 'Active' as const,
      avatarUrl: undefined,
      moduleAccess: {},
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();

  try {
    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting yourself
    if (user.id === auth.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

