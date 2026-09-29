import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { nowSec, toUserPlan } from "@/lib/card";
import { json } from "@/lib/cardServer";

/**
 * GET /api/card/me —— 当前登录账号的权益与已兑换卡密
 * 鉴权：站点登录态（与博客/论坛同一套认证）
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return json({ code: 401, msg: "请先登录", data: null }, 401, false);
  }

  const db = await getDb();
  const [raw, cards] = await Promise.all([
    db.getUserPlanRaw(user.id),
    db.listRedeemedCards(user.id),
  ]);
  const now = nowSec();

  return json({
    code: 0,
    msg: "ok",
    data: {
      plan: toUserPlan(raw ?? {}, now),
      cards: cards.map((c) => ({
        card_key: c.card_key,
        plan: c.plan,
        days: c.days,
        quota: c.quota,
        redeemed_at: c.redeemed_at,
      })),
    },
  });
}
