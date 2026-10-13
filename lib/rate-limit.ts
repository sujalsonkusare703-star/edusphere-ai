/**
 * Fixed-window rate limiter shared across serverless instances.
 *
 * Uses Upstash Redis over its REST API (no extra dependency). Configure either
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or the KV_REST_API_URL +
 * KV_REST_API_TOKEN pair that Vercel's Upstash integration creates.
 *
 * Without a store: development uses an in-process map; production reports
 * `configured: false` so callers can fail closed.
 */

export interface RateLimitResult {
  configured: boolean;
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

const devBuckets = new Map<string, { count: number; resetAt: number }>();

function storeConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowStart = nowSec - (nowSec % windowSeconds);
  const resetSeconds = windowStart + windowSeconds - nowSec;
  const store = storeConfig();

  if (!store) {
    if (process.env.NODE_ENV === "production") {
      return { configured: false, allowed: false, remaining: 0, resetSeconds };
    }
    const bucketKey = `${key}:${windowStart}`;
    const bucket = devBuckets.get(bucketKey) ?? { count: 0, resetAt: windowStart + windowSeconds };
    bucket.count += 1;
    devBuckets.set(bucketKey, bucket);
    for (const [k, v] of devBuckets) if (v.resetAt <= nowSec) devBuckets.delete(k);
    return { configured: true, allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetSeconds };
  }

  const redisKey = `ratelimit:${key}:${windowStart}`;
  const res = await fetch(`${store.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${store.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSeconds + 5)],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Rate limit store returned HTTP ${res.status}`);

  const body = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  const count = Number(body?.[0]?.result);
  if (!Number.isFinite(count)) throw new Error(body?.[0]?.error || "Rate limit store returned no count");

  return { configured: true, allowed: count <= limit, remaining: Math.max(0, limit - count), resetSeconds };
}
