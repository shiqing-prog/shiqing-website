import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { nowSec, toUserPlan } from "@/lib/card";
import {
  ipOf,
  isRateLimited,
  json,
  logCard,
  ok,
  preflight,
  readJsonBody,
  requireApiToken,
} from "@/lib/cardServer";

export function OPTIONS() {
  return preflight();
}

/**
 * POST /api/card/account-consume —— 消费当前登录账号的权益次数（词库/计费端调用）
 * 鉴权：Authorization: Bearer <CARD_API_TOKEN>
 * 请求：body: { user_id, request_id? }
 *
 * 为什么需要这个接口：卡密整卡兑换到账号后，权益里的「次数」需要可被真正核销，
 * 否则 users.plan_used 永远为 0（原本没有任何写入点）。这里提供原子的按次消费：
 * 仅当账号权益未过期且未超次数时 plan_used 自增 1。
 *
 * 幂等：同一 request_id 成功消费过则直接回放当前权益，不重复扣次。
 */
export async function POST(request: NextRequest) {
  const denied = await requireApiToken(request);
  if (denied) return denied;

  if (await isRateLimited(`card-account-consume:${ipOf(request)}`, 1200, 5 * 60 * 1000)) {
    return json({ code: 429, msg: "too many requests", data: null }, 429);
  }

  const body = await readJsonBody(request);
  const userId = String(body.user_id ?? "").trim();
  const requestId = String(body.request_id ?? "").trim().slice(0, 64);
  if (!userId) return json({ code: 400, msg: "user_id required", data: null }, 400);

  const db = await getDb();

  if (requestId) {
    const prior = await db.getSuccessfulAccountConsume(requestId);
    if (prior) {
      const raw = await db.getUserPlanRaw(userId);
      return ok({ valid: true, duplicate: true, plan: toUserPlan(raw ?? {}, nowSec()) });
    }
  }

  const now = nowSec();
  const consumed = await db.consumeUserPlan(userId, now);
  if (!consumed) {
    const raw = await db.getUserPlanRaw(userId);
    const plan = toUserPlan(raw ?? {}, now);
    const reason = plan.expiresAt < now ? "expired" : "quota_exceeded";
    await logCard({
      card_key: "",
      qq: "",
      action: "account_consume",
      ip: ipOf(request),
      request_id: requestId,
      detail: `invalid:${reason} user=${userId}`,
    });
    return json({
      code: 0,
      msg: "invalid",
      data: { valid: false, reason, plan },
    });
  }

  const raw = await db.getUserPlanRaw(userId);
  const plan = toUserPlan(raw ?? {}, now);
  await logCard({
    card_key: "",
    qq: "",
    action: "account_consume",
    ip: ipOf(request),
    request_id: requestId,
    detail: `ok user=${userId}`,
  });
  return ok({ valid: true, plan });
}
