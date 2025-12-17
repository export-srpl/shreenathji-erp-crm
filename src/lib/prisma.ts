// We intentionally do NOT import PrismaClient at module top level.
// Instead, we dynamically import it after clearing any Data Proxy engine
// env so that we always use the binary engine in this environment.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prismaSingleton: any | null = null;

export async function getPrismaClient() {
  if (!prismaSingleton) {
    // Always force the binary engine at runtime to avoid Data Proxy 'client' mode.
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';

    const { PrismaClient } = await import('@prisma/client');
    prismaSingleton = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaSingleton;
}
