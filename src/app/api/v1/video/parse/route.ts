import { NextRequest } from "next/server";
import { apiError, apiJson, authenticate, enforceQuota, preflight } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";

export function OPTIONS() {
  return preflight();
}

import { detectPlatform, parseVideo } from "@/lib/media/video";

/** 媒体类接口每天最多调用多少次 */
const VIDEO_DAILY_LIMIT = 120;

/**
 * GET /api/v1/video/parse?url=<视频链接>
 *
 * 支持哔哩哔哩（能拿 720P 以内的 MP4 直链），
 * 其它站点返回标题、封面、简介，有 og:video 时一并给直链。
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const quota = await enforceQuota(auth.auth);
  if (quota) return quota;

  const limitCheck = await checkRateLimit("api:video:" + auth.auth.cardKey, VIDEO_DAILY_LIMIT, 24 * 3600 * 1000);
  if (!limitCheck.ok) {
    return apiError(429, "video_daily_limit", "视频解析每天最多 " + VIDEO_DAILY_LIMIT + " 次", {
      "retry-after": String(Math.ceil((limitCheck.retryAfterMs ?? 3_600_000) / 1000)),
    });
  }

  const raw = (request.nextUrl.searchParams.get("url") ?? "").trim();
  if (!raw) {
    return apiError(400, "missing_url", "缺少 url 参数");
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return apiError(400, "invalid_url", "url 不是合法的链接");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return apiError(400, "invalid_url", "只接受 http / https 链接");
  }
  // 内网地址一律不接，免得被当成探测工具
  if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|::1)/i.test(parsed.hostname)) {
    return apiError(400, "invalid_url", "不接受内网地址");
  }

  try {
    const data = await parseVideo(parsed.toString());
    return apiJson({ data, meta: { platform: detectPlatform(parsed.toString()) } });
  } catch {
    return apiError(502, "upstream_unavailable", "解析失败，可能是链接失效或平台改版");
  }
}
