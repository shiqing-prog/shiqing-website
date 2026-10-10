import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { normalizeQq, nowSec } from "@/lib/card";
import { json, ok, preflight, requireApiToken } from "@/lib/cardServer";

export function OPTIONS() {
  return preflight();
}

/**
 * GET /api/card/qq-access?qq=xxx
 *
 * 查询某个 QQ 在本站卡密库里已绑定的权益（机器人卡密服务「站点桥」回落到本站时用）。
 * 鉴权：Authorization: Bearer <CARD_API_TOKEN>（与 verify / consume 同一把令牌）
 *
 * 响应：{ code:0, msg:"ok", data:{
 *   qq, active, permanent, expiresAt, remainingMs,   // expiresAt / remainingMs 为**毫秒**
 *   cards: string[],                                 // 该 QQ 名下当前有效的卡密
 *   records: [{ key, plan, days, quota, used, status, expired_at }]
 * }}
 */
export async function GET(request: NextRequest) {
  const denied = await requireApiToken(request);
  if (denied) return denied;

  const qqCheck = normalizeQq(request.nextUrl.searchParams.get("qq"));
  if (!qqCheck.ok) return json({ code: 400, msg: qqCheck.message, data: null }, 400);
  const qq = qqCheck.qq;

  const db = await getDb();
  const all = await db.listCardsByQq(qq);
  const now = nowSec();

  let active = false;
  let expiresAtSec = 0;
  const cards: string[] = [];
  const records: {
    key: string;
    plan: string;
    days: number;
    quota: number;
    used: number;
    status: number;
    expired_at: number;
  }[] = [];

  for (const card of all) {
    if (card.status !== 1) continue;
    const expiredAt = Number(card.expired_at ?? 0);
    // expired_at === 0 表示尚未开始计时（已绑定但没激活），仍然算有效
    if (expiredAt !== 0 && expiredAt < now) continue;
    active = true;
    cards.push(card.card_key);
    if (expiredAt > expiresAtSec) expiresAtSec = expiredAt;
    records.push({
      key: card.card_key,
      plan: card.plan,
      days: card.days,
      quota: card.quota,
      used: card.used,
      status: card.status,
      expired_at: expiredAt,
    });
  }

  const expiresAt = expiresAtSec > 0 ? expiresAtSec * 1000 : null;
  return ok({
    qq,
    active,
    permanent: false,
    expiresAt,
    remainingMs: expiresAt === null ? 0 : Math.max(0, expiresAt - Date.now()),
    cards,
    records,
  });
}
