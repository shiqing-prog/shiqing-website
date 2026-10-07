import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import {
  CARD_REASON_TEXT,
  checkCardUsable,
  normalizeQq,
  nowSec,
  type CardInvalidReason,
} from "@/lib/card";
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
import type { CardRecord } from "@/lib/types";

export function OPTIONS() {
  return preflight();
}

/** 消费成功时的 data 结构 */
function payload(card: CardRecord, extra: Record<string, unknown> = {}) {
  return {
    valid: true,
    plan: card.plan,
    days: card.days,
    expired_at: card.expired_at,
    quota: card.quota,
    used: card.used,
    bound_qq: card.bound_qq,
    ...extra,
  };
}

function invalid(reason: CardInvalidReason) {
  return json({
    code: 0,
    msg: "invalid",
    data: { valid: false, reason, message: CARD_REASON_TEXT[reason] },
  });
}

/**
 * POST /api/card/consume —— 消费一次（扣次数；首次消费绑定 QQ 并开始计时）
 * 请求：Authorization: Bearer <CARD_API_TOKEN>，body: { key, qq?, request_id? }
 *
 * 幂等：同一 request_id 重复调用（网络重试/重复提交）不会重复扣次数
 */
export async function POST(request: NextRequest) {
  const denied = await requireApiToken(request);
  if (denied) return denied;

  const ip = ipOf(request);
  if (await isRateLimited(`card-consume:${ip}`, 400, 5 * 60 * 1000)) {
    return json({ code: 429, msg: "too many requests", data: null }, 429);
  }

  const body = await readJsonBody(request);
  const key = String(body.key ?? "").trim();
  if (!key) return json({ code: 400, msg: "key required", data: null }, 400);

  const qqCheck = normalizeQq(body.qq);
  if (!qqCheck.ok) return json({ code: 400, msg: qqCheck.message, data: null }, 400);
  const qq = qqCheck.qq;
  const requestId = String(body.request_id ?? "").trim().slice(0, 64);

  const db = await getDb();

  // 幂等：同一 request_id + 同一张卡「成功消费过」→ 回放当前状态，不再扣次数
  // （只认成功日志且必须同卡：否则失败调用会污染 request_id，后续重放即可
  //  拿到 valid=true 却不扣次数，进而绕过 quota）
  if (requestId) {
    const prior = await db.getSuccessfulConsume(requestId, key);
    if (prior) {
      const current = await db.getCardByKey(key);
      if (current) return ok(payload(current, { duplicate: true }));
    }
  }

  const now = nowSec();
  const card = await db.getCardByKey(key);
  if (!card) {
    await logCard({ card_key: key, qq, action: "consume", ip, request_id: requestId, detail: "not_found" });
    return invalid("not_found");
  }

  const check = checkCardUsable(card, qq, now);
  if (!check.valid) {
    await logCard({ card_key: key, qq, action: "consume", ip, request_id: requestId, detail: check.reason });
    return invalid(check.reason);
  }

  // 单条条件 UPDATE：原子完成「校验 + 扣次 + 首次绑定 + 首次计时」
  const consumed = await db.consumeCard(key, qq, now);
  if (!consumed) {
    // 并发下可能刚好被其它请求用完/绑定 → 重新读取给出准确原因
    const fresh = await db.getCardByKey(key);
    let reason: CardInvalidReason = "not_found";
    if (fresh) {
      const recheck = checkCardUsable(fresh, qq, nowSec());
      reason = recheck.valid ? "quota_exceeded" : recheck.reason;
    }
    await logCard({
      card_key: key,
      qq,
      action: "consume",
      ip,
      request_id: requestId,
      detail: `raced:${reason}`,
    });
    return invalid(reason);
  }

  const after = await db.getCardByKey(key);
  await logCard({ card_key: key, qq, action: "consume", ip, request_id: requestId, detail: "ok" });
  if (!after) {
    return ok({ valid: true, expired_at: now + card.days * 86400 });
  }
  return ok(payload(after));
}
