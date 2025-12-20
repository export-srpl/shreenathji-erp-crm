import Redis from 'ioredis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }
  return redisClient;
}

export async function rateLimitRedis(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set to track requests with timeout
    const pipeline = redis.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    // Execute with timeout (500ms max)
    const results = await Promise.race([
      pipeline.exec(),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Redis timeout')), 500)
      ),
    ]) as any;

    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    // zcard result is at index 1
    const currentCount = (results[1]?.[1] as number) || 0;
    const allowed = currentCount < maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount - 1);
    const resetTime = now + windowMs;

    if (!allowed) {
      // Remove the request we just added (non-blocking)
      redis.zremrangebyrank(key, -1, -1).catch(() => {});
    }

    return { allowed, remaining, resetTime };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback to allowing the request if Redis fails (fail open for availability)
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }
}


