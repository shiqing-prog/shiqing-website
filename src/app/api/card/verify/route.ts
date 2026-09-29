import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { CARD_REASON_TEXT, checkCardUsable, normalizeQq, nowSec } from "@/lib/card";
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
 * POST /api/card/verify —— 校验卡密（无副作用，可高频调用）
 * 请求：Authorization: Bearer <CARD_API_TOKEN>，body: { key, qq? }
 * 响应：{ code:0, msg:"ok"|"invalid", data:{ valid, reason?, plan, expired_at, quota, used, bound_qq } }
 */
export async function POST(request: NextRequest) {
  const denied = await requireApiToken(request);
  if (denied) return denied;

  // 词库会高频调用，阈值放宽（仅用于挡压测）
  if (isRateLimited(`card-verify:${ipOf(request)}`, 1200, 5 * 60 * 1000)) {
    return json({ code: 429, msg: "too many requests", data: null }, 429);
  }

  const body = await readJsonBody(request);
  const key = String(body.key ?? "").trim();
  if (!key) return json({ code: 400, msg: "key required", data: null }, 400);

  const qqCheck = normalizeQq(body.qq);
  if (!qqCheck.ok) return json({ code: 400, msg: qqCheck.message, data: null }, 400);
  const qq = qqCheck.qq;

  const db = await getDb();
  const card = await db.getCardByKey(key);
  if (!card) {
    return json({
      code: 0,
      msg: "invalid",
      data: { valid: false, reason: "not_found", message: CARD_REASON_TEXT.not_found },
    });
  }

  const now = nowSec();
  const check = checkCardUsable(card, qq, now);
  if (!check.valid) {
    return json({
      code: 0,
      msg: "invalid",
      data: { valid: false, reason: check.reason, message: CARD_REASON_TEXT[check.reason] },
    });
  }

  return ok({
    valid: true,
    activated: check.activated,
    plan: card.plan,
    days: card.days,
    expired_at: card.expired_at,
    quota: card.quota,
    used: card.used,
    bound_qq: card.bound_qq,
  });
}

/**
 * GET /api/card/verify?key=xxx —— 只看卡密自身状态（不校验 QQ 绑定，便于排查）
 */
export async function GET(request: NextRequest) {
  const denied = await requireApiToken(request);
  if (denied) return denied;

  const key = (request.nextUrl.searchParams.get("key") ?? "").trim();
  const db = await getDb();
  const card = key ? await db.getCardByKey(key) : null;
  if (!card) {
    return json({
      code: 0,
      msg: "invalid",
      data: { valid: false, reason: "not_found", message: CARD_REASON_TEXT.not_found },
    });
  }

  const now = nowSec();
  if (card.status !== 1) {
    return json({
      code: 0,
      msg: "invalid",
      data: { valid: false, reason: "revoked", message: CARD_REASON_TEXT.revoked },
    });
  }
  if (card.expired_at !== 0 && card.expired_at < now) {
    return json({
      code: 0,
      msg: "invalid",
      data: { valid: false, reason: "expired", message: CARD_REASON_TEXT.expired },
    });
  }
  if (card.quota > 0 && card.used >= card.quota) {
    return json({
      code: 0,
      msg: "invalid",
      data: {
        valid: false,
        reason: "quota_exceeded",
        message: CARD_REASON_TEXT.quota_exceeded,
      },
    });
  }

  await logCard({
    card_key: key,
    qq: "",
    action: "verify",
    ip: ipOf(request),
    request_id: "",
    detail: "get",
  });

  return ok({
    valid: true,
    activated: card.expired_at !== 0,
    plan: card.plan,
    days: card.days,
    expired_at: card.expired_at,
    quota: card.quota,
    used: card.used,
    bound_qq: card.bound_qq,
  });
}
