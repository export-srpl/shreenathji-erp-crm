import { rateLimitRedis } from './rate-limit-redis';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory rate limit cache using Map
// In production, consider using Redis for distributed rate limiting
// Note: This is in-memory and will reset on server restart
// For production with multiple instances, use Redis or a distributed cache
const rateLimitCache = new Map<string, RateLimitRecord>();

// Toggle Redis usage based on environment
const USE_REDIS = !!process.env.REDIS_URL;

// Cleanup function - call periodically or on each request
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, record] of rateLimitCache.entries()) {
    if (now > record.resetTime) {
      rateLimitCache.delete(key);
    }
  }
  
  // Limit cache size to prevent memory issues
  if (rateLimitCache.size > 10000) {
    // Remove oldest 1000 entries
    const entries = Array.from(rateLimitCache.entries());
    entries.slice(0, 1000).forEach(([key]) => rateLimitCache.delete(key));
  }
}

/**
 * In-memory rate limiting implementation
 */
async function rateLimitMemory(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Cleanup expired entries on each request
  cleanupExpiredEntries();

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const record = rateLimitCache.get(key);

  if (!record || now > record.resetTime) {
    // Create new rate limit window
    const resetTime = now + windowMs;
    rateLimitCache.set(key, {
      count: 1,
      resetTime,
    });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  rateLimitCache.set(key, record);
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Rate limiting utility
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and remaining requests
 */
export async function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Use Redis-based rate limiting when configured
  if (USE_REDIS) {
    return rateLimitRedis(identifier, maxRequests, windowMs);
  }

  // Fallback to in-memory implementation
  return rateLimitMemory(identifier, maxRequests, windowMs);
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: Request): string {
  // Check various headers for IP (in order of preference)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // Fallback to 'unknown' if no IP found
  return 'unknown';
}

