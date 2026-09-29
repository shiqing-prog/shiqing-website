import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import {
  CARD_LIMITS,
  CARD_REQUEST_RULES,
  cardRequestView,
  clampInt,
  nowSec,
  sanitizePlan,
} from "@/lib/card";
import { ipOf, isRateLimited, json, logCard, ok, readJsonBody } from "@/lib/cardServer";

/**
 * /api/card/request —— 卡密申请（与站点同一套账号体系）
 *
 * GET  ：当前登录用户的申请记录（最新在前）+ 待审核数 + 申请规则
 * POST ：提交申请，body { plan?, days?, quota?, reason, contact? }
 *
 * 防刷：
 *   - 必须登录（未登录返回 401）
 *   - 同时只允许 1 条待审核申请（重复提交直接 409，避免管理员被刷屏）
 *   - 每 24 小时最多 3 次提交
 *   - 内存限流 5 次/10 分钟
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return json({ code: 401, msg: "请先登录后再查看申请", data: null }, 401, false);
  }
  const db = await getDb();
  const rows = await db.listCardRequestsByUser(user.id, 20);
  const pending = await db.countPendingCardRequests(user.id);
  return ok({
    pending,
    rules: {
      maxPending: CARD_REQUEST_RULES.maxPending,
      dailyLimit: CARD_REQUEST_RULES.dailyLimit,
      plans: [...CARD_REQUEST_RULES.plans],
      reasonMin: CARD_REQUEST_RULES.reason.min,
      reasonMax: CARD_REQUEST_RULES.reason.max,
    },
    rows: rows.map(cardRequestView),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return json({ code: 401, msg: "请先登录后再申请卡密", data: null }, 401, false);
  }
  if (isRateLimited(`card-request:${user.id}`, 5, 10 * 60 * 1000)) {
    return json({ code: 429, msg: "提交过于频繁，请稍后再试", data: null }, 429, false);
  }

  const body = await readJsonBody(request);
  const plan = sanitizePlan(body.plan || "basic");
  const days = clampInt(body.days, CARD_LIMITS.days);
  const quota = clampInt(body.quota, CARD_LIMITS.quota);
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const rawContact = typeof body.contact === "string" ? body.contact.trim() : "";
  const contact = (rawContact || user.email || "").slice(0, CARD_REQUEST_RULES.contact.max);

  if (reason.length < CARD_REQUEST_RULES.reason.min) {
    return json(
      { code: 400, msg: `申请理由至少 ${CARD_REQUEST_RULES.reason.min} 个字`, data: null },
      400,
      false
    );
  }
  if (reason.length > CARD_REQUEST_RULES.reason.max) {
    return json(
      { code: 400, msg: `申请理由最多 ${CARD_REQUEST_RULES.reason.max} 个字`, data: null },
      400,
      false
    );
  }
  if (!contact) {
    return json({ code: 400, msg: "请填写联系方式（QQ 或邮箱）", data: null }, 400, false);
  }

  const db = await getDb();
  const now = nowSec();

  const pending = await db.countPendingCardRequests(user.id);
  if (pending >= CARD_REQUEST_RULES.maxPending) {
    return json(
      { code: 409, msg: "你已有待审核的申请，请等待管理员处理", data: { pending } },
      409,
      false
    );
  }
  const recent = await db.countRecentCardRequests(user.id, now - 86400);
  if (recent >= CARD_REQUEST_RULES.dailyLimit) {
    return json(
      { code: 429, msg: `每 24 小时最多提交 ${CARD_REQUEST_RULES.dailyLimit} 次申请`, data: null },
      429,
      false
    );
  }

  await db.createCardRequest({
    user_id: user.id,
    plan,
    days,
    quota,
    reason,
    contact,
    status: 0,
    card_key: "",
    review_note: "",
    reviewed_by: "",
    reviewed_at: 0,
    created_at: now,
  });

  await logCard({
    card_key: "",
    qq: "",
    action: "request",
    ip: ipOf(request),
    request_id: "",
    detail: `user=${user.id} plan=${plan} days=${days} quota=${quota}`,
  });

  const rows = await db.listCardRequestsByUser(user.id, 20);
  return ok(
    { pending: await db.countPendingCardRequests(user.id), rows: rows.map(cardRequestView) },
    "已提交，等待管理员审核"
  );
}
