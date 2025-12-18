import { getPrismaClient } from '@/lib/prisma';
import { cookies } from 'next/headers';

export type AppRole = 'admin' | 'sales' | 'finance' | 'user';

export interface AuthContext {
  userId: string | null;
  firebaseUid: string | null;
  email: string | null;
  role: AppRole;
}

/**
 * Secure auth helper for API routes.
 * 
 * SECURITY: Uses cookie-based authentication only. No fallback to admin.
 * All requests must have a valid session cookie.
 * 
 * - Reads app_session and user_email cookies
 * - Validates session is active
 * - Looks up user in Postgres User table
 * - Returns null userId if authentication fails (no admin fallback)
 */
export async function getAuthContext(req: Request): Promise<AuthContext> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('app_session');

    // STRICT: No authentication = no access (no admin fallback)
    if (!sessionCookie?.value) {
      return {
        userId: null,
        firebaseUid: null,
        email: null,
        role: 'user', // Default to least privilege
      };
    }

    const prisma = await getPrismaClient();
    
    // Validate session token from database
    const session = await prisma.session.findUnique({
      where: { token: sessionCookie.value },
      include: { user: true },
    });

    // Check if session exists and is not expired
    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return {
        userId: null,
        firebaseUid: null,
        email: null,
        role: 'user',
      };
    }

    // Check if session has timed out due to inactivity
    const { isSessionTimedOut, updateSessionActivity } = await import('./session-timeout');
    if (await isSessionTimedOut(sessionCookie.value)) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return {
        userId: null,
        firebaseUid: null,
        email: null,
        role: 'user',
      };
    }

    // Update session activity
    await updateSessionActivity(sessionCookie.value);

    const user = session.user;
    if (!user) {
      return {
        userId: null,
        firebaseUid: null,
        email: null,
        role: 'user',
      };
    }

    return {
      userId: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: (user.role as AppRole) || 'user',
    };
  } catch (error) {
    console.error('Auth context error:', error);
    // Fail securely - return no access
    return {
      userId: null,
      firebaseUid: null,
      email: null,
      role: 'user',
    };
  }
}

export function isRoleAllowed(role: AppRole, allowed: AppRole[]): boolean {
  return allowed.includes(role);
}

