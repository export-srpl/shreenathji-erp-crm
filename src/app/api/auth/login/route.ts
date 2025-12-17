import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body as { email: string; password: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const prisma = await getPrismaClient();

  // Try to find an existing user by email
  let user = await prisma.user.findUnique({ where: { email } });

  // Bootstrap: if no user yet but the credentials match the APP_* env, create an admin user
  const envEmail = process.env.APP_LOGIN_EMAIL;
  const envPassword = process.env.APP_LOGIN_PASSWORD;

  if (!user && envEmail && envPassword && email === envEmail && password === envPassword) {
    const passwordHash = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: {
        email,
        firebaseUid: `env-${Buffer.from(email).toString('base64')}`,
        name: null,
        role: 'admin',
        passwordHash,
      },
    });
  }

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });

  res.cookies.set('app_session', 'valid', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
  });

  return res;
}

