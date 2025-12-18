import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/users - List all users
export async function GET() {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Map Prisma User to frontend User type
    const mappedUsers = users.map((u) => ({
      id: u.id,
      name: u.name || 'Unknown',
      email: u.email,
      role: u.role === 'admin' ? 'Admin' : (u.role === 'sales' ? 'Sales' : (u.role === 'finance' ? 'Finance' : 'User')),
      status: 'Active' as const, // We don't have a status field in Prisma, defaulting to Active
      avatarUrl: undefined,
      moduleAccess: {}, // Module access not stored in DB yet, can be added later
    }));

    return NextResponse.json(mappedUsers);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();
  const { name, email, role, password } = body as {
    name?: string;
    email?: string;
    role?: string;
    password?: string;
  };

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Validate email domain
  const normalisedEmail = email.trim().toLowerCase();
  const allowedDomain = 'shreenathjirasayan.com';
  if (!normalisedEmail.endsWith(`@${allowedDomain}`)) {
    return NextResponse.json(
      { error: `Only company emails (@${allowedDomain}) are allowed.` },
      { status: 400 },
    );
  }

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;
    const firebaseUid = `app-${Buffer.from(normalisedEmail).toString('base64')}`;

    // Map frontend role to database role
    const dbRole = role === 'Admin' ? 'admin' : (role === 'Sales' ? 'sales' : (role === 'Finance' ? 'finance' : 'user'));

    const user = await prisma.user.create({
      data: {
        email: normalisedEmail,
        firebaseUid,
        name: name || null,
        role: dbRole,
        passwordHash,
      },
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
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

