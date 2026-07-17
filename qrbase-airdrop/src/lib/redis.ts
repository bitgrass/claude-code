import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
    return null;
  }
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  });
  return redis;
}

// Exposed for the usage-tracking layer, which needs the raw client for atomic
// HINCRBY/pipeline aggregation. Returns null when Redis is not configured.
export function getRedisClient(): Redis | null {
  return getRedis();
}

// Redis is a cache/rate-limit convenience — it must NEVER break a request.
// Every helper below degrades gracefully if Redis is unreachable, over quota,
// or erroring (e.g. Upstash "max requests limit exceeded"), because a hard
// throw here previously 500'd eligibility/claim endpoints.
function logRedisFailure(op: string, err: unknown): void {
  console.error(`Redis ${op} failed (continuing without cache):`, err instanceof Error ? err.message : err);
}

export async function rateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const client = getRedis();
  if (!client) return { allowed: true, remaining: maxAttempts };

  try {
    const current = await client.incr(key);
    if (current === 1) {
      await client.expire(key, windowSeconds);
    }
    return {
      allowed: current <= maxAttempts,
      remaining: Math.max(0, maxAttempts - current),
    };
  } catch (err) {
    // Fail OPEN: if we can't rate limit we still serve the request rather than
    // breaking the endpoint. Abuse protection degrades; availability wins.
    logRedisFailure("rateLimit", err);
    return { allowed: true, remaining: maxAttempts };
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return await client.get<T>(key);
  } catch (err) {
    logRedisFailure("cacheGet", err); // treat as a cache miss
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 60
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    logRedisFailure("cacheSet", err);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    logRedisFailure("cacheDelete", err);
  }
}

// Persistent settings (no TTL)
export async function settingGet(key: string): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return await client.get<string>(key);
  } catch (err) {
    logRedisFailure("settingGet", err);
    return null;
  }
}

export async function settingSet(key: string, value: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(key, value);
  } catch (err) {
    logRedisFailure("settingSet", err);
  }
}

export async function settingDelete(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    logRedisFailure("settingDelete", err);
  }
}
