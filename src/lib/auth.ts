import { getPrismaClient } from '@/lib/prisma';
import { cookies } from 'next/headers';

export type AppRole = 'admin' | 'sales' | 'finance' | 'user';

export interface AuthContext {
  userId: string | null;
  firebaseUid: string | null;
  email: string | null;
  role: AppRole;
  salesScope?: string | null; // 'export_sales' or 'domestic_sales'
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

    // Check if session has timed out due to inactivity (optimized - check in-memory first)
    const now = new Date();
    const timeSinceLastActivity = Date.now() - session.lastActivityAt.getTime();
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    
    if (session.expiresAt < now || timeSinceLastActivity > SESSION_TIMEOUT_MS) {
      // Session expired or timed out - delete in background
      prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return {
        userId: null,
        firebaseUid: null,
        email: null,
        role: 'user',
      };
    }

    // Update session activity (non-blocking if not critical)
    // Only update if last activity was more than 1 minute ago to reduce DB writes
    if (timeSinceLastActivity > 60 * 1000) {
      prisma.session.updateMany({
        where: { token: sessionCookie.value },
        data: { lastActivityAt: now },
      }).catch(() => {}); // Non-blocking
    }

    const user = session.user;
    if (!user) {
      return {
        userId: null,
        firebaseUid: null,
        email: null,
        role: 'user',
      };
    }

    // Normalize role to lowercase to match AppRole type
    const userRole = (user.role || 'user').toLowerCase() as AppRole;
    
    return {
      userId: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: userRole,
      salesScope: (user as any).salesScope || null,
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
  // Normalize role to lowercase for comparison
  const normalizedRole = role?.toLowerCase() as AppRole;
  const normalizedAllowed = allowed.map(r => r.toLowerCase() as AppRole);
  return normalizedAllowed.includes(normalizedRole);
}

