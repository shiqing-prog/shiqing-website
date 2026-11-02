import { NextRequest } from "next/server";
import { apiError, apiJson, authenticate, enforceQuota, preflight } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";

export function OPTIONS() {
  return preflight();
}

import { MUSIC_PLATFORMS, isPlatformId, platformLabel, searchMusic } from "@/lib/media/music";
import type { MusicPlatform } from "@/lib/media/music";

/** 媒体类接口每天最多调用多少次（三家平台加起来） */
const MEDIA_DAILY_LIMIT = 200;

/**
 * GET /api/v1/music/search?platform=netease&q=关键词&limit=8
 *
 * 在网易云 / QQ 音乐 / 酷狗里搜歌，返回统一的曲目结构。
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const quota = await enforceQuota(auth.auth);
  if (quota) return quota;

  const limitCheck = await checkRateLimit("api:media:" + auth.auth.cardKey, MEDIA_DAILY_LIMIT, 24 * 3600 * 1000);
  if (!limitCheck.ok) {
    return apiError(429, "media_daily_limit", "媒体解析每天最多 " + MEDIA_DAILY_LIMIT + " 次", {
      "retry-after": String(Math.ceil((limitCheck.retryAfterMs ?? 3_600_000) / 1000)),
    });
  }

  const params = request.nextUrl.searchParams;
  const platform = (params.get("platform") ?? "netease") as MusicPlatform;
  const keyword = (params.get("q") ?? "").trim();
  const limit = Number(params.get("limit") ?? "8");

  if (!MUSIC_PLATFORMS.includes(platform)) {
    return apiError(400, "unsupported_platform", "只支持 netease / tencent / kugou 三个平台");
  }
  if (!keyword) {
    return apiError(400, "missing_query", "缺少 q 参数（要搜的歌名或歌手）");
  }
  if (!isPlatformId(keyword) && keyword.length > 64) {
    return apiError(400, "query_too_long", "关键词太长了，控制在 64 字以内");
  }

  try {
    const data = await searchMusic(platform, keyword, limit);
    return apiJson({
      data,
      meta: { platform: platform, platform_label: platformLabel(platform), query: keyword, count: data.length },
    });
  } catch {
    return apiError(502, "upstream_unavailable", platformLabel(platform) + " 暂时没有返回结果，稍后再试");
  }
}
