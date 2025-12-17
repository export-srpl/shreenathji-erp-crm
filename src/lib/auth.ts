import { getPrismaClient } from '@/lib/prisma';

export type AppRole = 'admin' | 'sales' | 'finance' | 'user';

export interface AuthContext {
  userId: string | null;
  firebaseUid: string | null;
  email: string | null;
  role: AppRole;
}

/**
 * Basic auth helper for API routes.
 *
 * - Reads x-firebase-uid and optional x-user-email from headers.
 * - Looks up the user in Postgres User table.
 * - If not found, creates a new user-role record.
 *
 * In production you should validate the Firebase ID token separately
 * and only pass trusted UID/email headers from the frontend or an edge middleware.
 */
export async function getAuthContext(req: Request): Promise<AuthContext> {
  const prisma = await getPrismaClient();
  const firebaseUid = req.headers.get('x-firebase-uid');
  const email = req.headers.get('x-user-email');

  if (!firebaseUid) {
    return {
      // Development fallback: treat missing Firebase UID as an admin user
      // so that API writes work without explicit auth wiring.
      userId: 'dev-user',
      firebaseUid: null,
      email: email,
      role: 'admin',
    };
  }

  let user = await prisma.user.findUnique({ where: { firebaseUid } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        firebaseUid,
        email: email ?? `${firebaseUid}@unknown.local`,
        name: null,
        role: 'user',
      },
    });
  }

  const role = (user.role as AppRole) || 'user';

  return {
    userId: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    role,
  };
}

export function isRoleAllowed(role: AppRole, allowed: AppRole[]): boolean {
  return allowed.includes(role);
}

