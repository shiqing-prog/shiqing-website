// 简单的内存限流（单实例有效；Cloudflare Worker 单实例部署够用）
const buckets = new Map<string, { count: number; resetAt: number }>();
let checks = 0;

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 10 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  // 定期清理过期条目，防止 Map 无限增长
  checks += 1;
  if (checks % 100 === 0) {
    for (const [k, v] of buckets) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
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
