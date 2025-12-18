import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // SECURITY: Rate limiting - 3 requests per hour per IP
  const clientIP = getClientIP(req);
  const limit = await rateLimit(clientIP, 3, 60 * 60 * 1000);
  
  if (!limit.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many password reset requests. Please try again later.',
        retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((limit.resetTime - Date.now()) / 1000).toString(),
        }
      }
    );
  }

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

  // SECURITY: Never log reset tokens in production
  // In a real production setup, wire this up to an SMTP provider.
  if (process.env.NODE_ENV === 'development') {
    console.info('Password reset link for', normalisedEmail, ':', resetUrl);
  } else {
    // In production, send email via secure service (SendGrid, AWS SES, etc.)
    // TODO: Implement email sending service
    console.info('Password reset link generated for', normalisedEmail);
  }

  // Optionally, you can integrate with an email service here using env-based SMTP config.

  return NextResponse.json({ success: true });
}


