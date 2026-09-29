import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { CARD_REASON_TEXT, checkCardUsable, mergePlan, nowSec, planView, toUserPlan } from "@/lib/card";
import { ipOf, isRateLimited, json, logCard, readJsonBody } from "@/lib/cardServer";

/**
 * POST /api/card/redeem —— 把整张卡密兑换到**当前登录账号**（与博客/论坛同一套用户表与认证）
 *
 * 鉴权：站点登录态（bbs_session Cookie），不需要 Bearer token
 * body: { key }
 *
 * 语义（与「按次使用」二选一）：
 *   - 只有「未被按次使用过、未被兑换过、未绑定 QQ/账号」的卡密才能整卡兑换
 *   - 兑换后卡密 bound_user_id = 当前用户，且不再能被词库端 consume
 *   - 权益叠加到 users 表的 plan_* 字段：到期时间往后顺延、次数相加（0 视为不限）
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return json({ code: 401, msg: "请先登录后再兑换", data: null }, 401, false);
  }
  // 限流：防止用脚本爆破卡密（10 次/10 分钟）
  if (isRateLimited(`card-redeem:${user.id}`, 10, 10 * 60 * 1000)) {
    return json({ code: 429, msg: "兑换尝试过于频繁，请稍后再试", data: null }, 429, false);
  }

  const body = await readJsonBody(request);
  const key = String(body.key ?? "").trim();
  if (!key) return json({ code: 400, msg: "请输入卡密", data: null }, 400, false);

  const db = await getDb();
  const now = nowSec();
  const card = await db.getCardByKey(key);
  if (!card) {
    return json({
      code: 0,
      msg: "invalid",
      data: { valid: false, reason: "not_found", message: CARD_REASON_TEXT.not_found },
    });
  }

  // 同一账号重复提交同一张卡 → 幂等返回当前权益
  if (card.redeemed_at !== 0 && card.bound_user_id === user.id) {
    const raw = await db.getUserPlanRaw(user.id);
    return json({
      code: 0,
      msg: "ok",
      data: { redeemed: true, duplicate: true, plan: toUserPlan(raw ?? {}, now) },
    });
  }

  // QQ 传空：已被词库端绑定/使用的卡密会返回 qq_mismatch 或 redeemed，避免抢别人的卡
  const check = checkCardUsable(card, "", now);
  if (!check.valid) {
    return json({
      code: 0,
      msg: "invalid",
      data: { valid: false, reason: check.reason, message: CARD_REASON_TEXT[check.reason] },
    });
  }

  const bound = await db.redeemCard(key, user.id, now);
  if (!bound) {
    // 并发或已被其它账号兑换 → 重新读取给出准确原因
    const fresh = await db.getCardByKey(key);
    let reason = "not_found";
    if (fresh) {
      if (fresh.redeemed_at !== 0) reason = "redeemed";
      else if (fresh.used !== 0 || fresh.bound_qq !== "") reason = "qq_mismatch";
      else reason = "expired";
    }
    return json({
      code: 0,
      msg: "invalid",
      data: { valid: false, reason, message: CARD_REASON_TEXT[reason as keyof typeof CARD_REASON_TEXT] },
    });
  }

  // 叠加账号权益（users 表 plan_* 字段）
  const raw = await db.getUserPlanRaw(user.id);
  const merged = mergePlan(
    {
      plan: raw?.plan ?? "free",
      expiresAt: raw?.plan_expires_at ?? 0,
      quota: raw?.plan_quota ?? 0,
      used: raw?.plan_used ?? 0,
    },
    card,
    now
  );
  await db.setUserPlan(user.id, merged);

  await logCard({
    card_key: key,
    qq: "",
    action: "redeem",
    ip: ipOf(request),
    request_id: "",
    detail: `user=${user.id} plan=${card.plan} days=${card.days} quota=${card.quota}`,
  });

  return json({
    code: 0,
    msg: "ok",
    data: {
      redeemed: true,
      card: { plan: card.plan, days: card.days, quota: card.quota },
      // 注意用 planView（camelCase 结构）而不是 toUserPlan（DB snake_case 行）
      plan: planView(merged, now),
    },
  });
}
