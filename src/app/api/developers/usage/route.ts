import { NextResponse } from "next/server";
import { authenticate, DAILY_LIMIT, todayUsage } from "@/lib/api";
import { serverError } from "@/lib/http";

/** 卡密只露头尾，避免整串出现在页面/截图里 */
function maskKey(key: string): string {
  if (key.length <= 10) return key;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

/**
 * 开发者自助查用量。
 *
 * 鉴权复用对外 API 的 authenticate()：卡密和 sk_ 令牌都能查，
 * 但只回自己的数据，不接受任何 id 参数（防止枚举别人的用量）。
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) return auth.response;
    const { cardKey, card, token } = auth.auth;

    const used = await todayUsage(cardKey);
    return NextResponse.json(
      {
        ok: true,
        cardKey: maskKey(cardKey),
        plan: card.plan ?? null,
        expiredAt: card.expired_at ?? 0,
        daily: { used, limit: DAILY_LIMIT, remaining: Math.max(DAILY_LIMIT - used, 0) },
        token: token ? maskKey(token) : null,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return serverError("developers.usage", err, "查询用量失败");
  }
}
