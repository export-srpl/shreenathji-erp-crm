import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/login/complete-2fa
 * Complete login after 2FA verification
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body as { email: string };

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const tempToken = cookieStore.get('2fa_temp_token');

    if (!tempToken) {
      return NextResponse.json({ error: '2FA verification session expired. Please login again.' }, { status: 401 });
    }

    const prisma = await getPrismaClient();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify the temp token contains the correct user ID
    const tokenData = Buffer.from(tempToken.value, 'base64').toString();
    const [userId] = tokenData.split(':');
    
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Invalid verification session' }, { status: 401 });
    }

    // Clear temp token and set secure session cookies
    const isProduction = Boolean(
      process.env.VERCEL_ENV === 'production' || 
      process.env.NODE_ENV === 'production' ||
      (process.env.VERCEL_URL && process.env.VERCEL_URL.startsWith('https://'))
    );

    // SECURITY: Generate secure session token
    const crypto = await import('crypto');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Parse user agent for device, browser, and OS
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const { parseUserAgent } = await import('@/lib/user-agent-parser');
    const { device, browser, os } = parseUserAgent(userAgent);

    // Get location from IP (non-blocking)
    const { getLocationFromIP } = await import('@/lib/ip-geolocation');
    const location = await getLocationFromIP(clientIP).catch(() => ({ city: null, country: null }));

    // Store session in database
    const session = await prisma.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt: sessionExpiry,
        ipAddress: clientIP,
        userAgent,
        device,
        browser,
        os,
        city: location.city,
        country: location.country,
      },
    });

    const res = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name } 
    });

    // Clear temp token
    res.cookies.delete('2fa_temp_token');

    // Set secure session cookies
    res.cookies.set('app_session', sessionToken, {
      httpOnly: true,
      secure: isProduction,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'strict',
    });

    res.cookies.set('user_email', user.email, {
      httpOnly: true,
      secure: isProduction,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'strict',
    });

    return res;
  } catch (error) {
    console.error('Failed to complete 2FA login:', error);
    return NextResponse.json(
      { error: 'Failed to complete login', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

