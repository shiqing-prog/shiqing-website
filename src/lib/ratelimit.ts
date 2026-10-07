import { hitRateLimitDb } from "./data";

/**
 * 限流结果（异步：线上走 D1，多 isolate 共享同一计数）
 */
export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

/**
 * 内存桶：**仅**作为 D1 不可用时的回退（本地 next dev / 线上表未建 /
 * RETURNING 不支持）。多 isolate 下各自独立，计数会宽于阈值，
 * 因此线上以 D1 为准，避免旧实现的「多 isolate 等于没有限流」。
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
let checks = 0;

function memoryHit(key: string, windowMs: number): { count: number; resetAt: number } {
  const now = Date.now();
  checks += 1;
  if (checks % 100 === 0) {
    for (const [k, v] of buckets) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { count: 1, resetAt };
  }
  bucket.count += 1;
  return { count: bucket.count, resetAt: bucket.resetAt };
}

/**
 * 限流：优先 D1 原子计数，失败回退内存桶。
 * 调用第 limit+1 次时判定超限（与旧行为一致：limit 次放行）。
 */
export async function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 10 * 60 * 1000
): Promise<RateLimitResult> {
  const hit = (await hitRateLimitDb(key, limit, windowMs)) ?? memoryHit(key, windowMs);
  if (hit.count > limit) {
    return { ok: false, retryAfterMs: Math.max(0, hit.resetAt - Date.now()) };
  }
  return { ok: true };
}

/** 从请求头获取客户端 IP（Cloudflare 边缘注入） */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
