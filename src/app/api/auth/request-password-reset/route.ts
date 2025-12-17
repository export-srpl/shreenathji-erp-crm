import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const normalisedEmail = email.trim().toLowerCase();
  const allowedDomain = 'shreenathjirasayan.com';

  if (!normalisedEmail.endsWith(`@${allowedDomain}`)) {
    return NextResponse.json(
      { error: `Only company emails (@${allowedDomain}) are allowed.` },
      { status: 400 },
    );
  }

  const prisma = await getPrismaClient();

  const user = await prisma.user.findUnique({ where: { email: normalisedEmail } });

  // Always respond success-style even if the user does not exist,
  // to avoid leaking which emails are registered.
  if (!user) {
    return NextResponse.json({ success: true });
  }

  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password/${token}`;

  // In a real production setup, wire this up to an SMTP provider.
  // For now, log the link on the server so it can be retrieved during testing.
  console.info('Password reset link for', normalisedEmail, ':', resetUrl);

  // Optionally, you can integrate with an email service here using env-based SMTP config.

  return NextResponse.json({ success: true });
}


