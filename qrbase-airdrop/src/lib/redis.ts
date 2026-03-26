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

export async function rateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const client = getRedis();
  if (!client) return { allowed: true, remaining: maxAttempts };

  const current = await client.incr(key);
  if (current === 1) {
    await client.expire(key, windowSeconds);
  }

  return {
    allowed: current <= maxAttempts,
    remaining: Math.max(0, maxAttempts - current),
  };
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  return client.get(key);
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 60
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.set(key, value, { ex: ttlSeconds });
}

// Persistent settings (no TTL)
export async function settingGet(key: string): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;
  return client.get<string>(key);
}

export async function settingSet(key: string, value: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.set(key, value);
}

export async function settingDelete(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.del(key);
}
