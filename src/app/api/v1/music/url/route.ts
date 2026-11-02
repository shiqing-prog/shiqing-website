import { NextRequest } from "next/server";
import { apiError, apiJson, authenticate, enforceQuota, preflight } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";

export function OPTIONS() {
  return preflight();
}

import { MUSIC_PLATFORMS, isPlatformId, musicUrl, platformLabel } from "@/lib/media/music";
import type { MusicPlatform } from "@/lib/media/music";

/**
 * GET /api/v1/music/url?platform=netease&id=85580&quality=320
 *
 * 取单曲的播放直链。拿不到不报错，返回 playable: false 和原因。
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const quota = await enforceQuota(auth.auth);
  if (quota) return quota;

  const params = request.nextUrl.searchParams;
  const platform = (params.get("platform") ?? "netease") as MusicPlatform;
  const id = (params.get("id") ?? "").trim();
  const quality = params.get("quality") ?? "320";

  if (!MUSIC_PLATFORMS.includes(platform)) {
    return apiError(400, "unsupported_platform", "只支持 netease / tencent / kugou 三个平台");
  }
  if (!id || !isPlatformId(id)) {
    return apiError(400, "invalid_id", "id 参数不合法（曲目 id 由／music/search 返回）");
  }

  try {
    const data = await musicUrl(platform, id, quality);
    return apiJson({ data });
  } catch {
    return apiError(502, "upstream_unavailable", platformLabel(platform) + " 暂时不可用，稍后再试");
  }
}
