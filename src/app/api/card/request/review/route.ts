import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import {
  CARD_LIMITS,
  cardRequestView,
  clampInt,
  genKey,
  nowSec,
  sanitizePlan,
  sanitizePrefix,
} from "@/lib/card";
import {
  ipOf,
  isRateLimited,
  json,
  logCard,
  ok,
  readJsonBody,
  requireAdmin,
} from "@/lib/cardServer";
import type { CardRecord } from "@/lib/types";

/**
 * POST /api/card/request/review —— 审核卡密申请（管理员）
 * 鉴权：管理员登录态 或 Bearer <CARD_ADMIN_TOKEN>
 * body: { id, action: "approve" | "reject", note?, plan?, days?, quota?, prefix? }
 *
 * 通过（approve）时**自动发卡**：按申请里的 plan/days/quota 生成 1 张卡密，
 * 写进 cards 表并把卡号回填到申请记录（用户可在「个人设置 → 卡密兑换」一键入账）。
 * 拒绝（reject）时只写备注。
 *
 * 并发安全：审核用「仅当 status = 0 时才更新」的条件 UPDATE；
 * 若卡密已插入但审核落空（别人已先审），立刻把这张卡吊销，避免产生无主卡密。
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  if (await isRateLimited(`card-review:${ipOf(request)}`, 60, 10 * 60 * 1000)) {
    return json({ code: 429, msg: "操作过于频繁，请稍后再试", data: null }, 429, false);
  }

  const body = await readJsonBody(request);
  const id = Number(body.id ?? 0);
  const action = String(body.action ?? "");
  if (!Number.isInteger(id) || id <= 0) {
    return json({ code: 400, msg: "缺少申请 id", data: null }, 400, false);
  }
  if (action !== "approve" && action !== "reject") {
    return json({ code: 400, msg: "action 只能是 approve 或 reject", data: null }, 400, false);
  }

  const db = await getDb();
  const req = await db.getCardRequest(id);
  if (!req) {
    return json({ code: 404, msg: "申请不存在", data: null }, 404, false);
  }
  if (Number(req.status) !== 0) {
    return json(
      { code: 409, msg: "该申请已被审核过", data: cardRequestView(req) },
      409,
      false
    );
  }

  // requireAdmin 已通过：可能是管理员登录态，也可能是 ADMIN_TOKEN 脚本
  const admin = await getSessionUser(request);
  const reviewerId = admin?.id ?? "token";
  const now = nowSec();
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";

  if (action === "reject") {
    const done = await db.reviewCardRequest(id, {
      status: 2,
      cardKey: "",
      note: note || "未通过审核",
      reviewerId,
      reviewedAt: now,
    });
    if (!done) {
      return json({ code: 409, msg: "该申请刚刚已被处理，请刷新", data: null }, 409, false);
    }
    await logCard({
      card_key: "",
      qq: "",
      action: "request_reject",
      ip: ipOf(request),
      request_id: "",
      detail: `id=${id} user=${req.user_id} by=${reviewerId}`,
    });
    const fresh = await db.getCardRequest(id);
    return ok({ row: fresh ? cardRequestView(fresh) : null }, "已拒绝");
  }

  // ---- 通过：按申请（可被管理员覆盖）的参数发一张卡 ----
  const plan = sanitizePlan(body.plan ?? req.plan);
  const days = clampInt(body.days ?? req.days, CARD_LIMITS.days);
  const quota = clampInt(body.quota ?? req.quota, CARD_LIMITS.quota);
  const prefix = sanitizePrefix(body.prefix);

  const cardKey = genKey(prefix, plan);
  const card: CardRecord = {
    card_key: cardKey,
    prefix,
    plan,
    days,
    quota,
    used: 0,
    bound_qq: "",
    bound_user_id: "",
    redeemed_at: 0,
    // 未激活：用户兑换到账号时才开始计时（与后台默认行为一致）
    expired_at: 0,
    created_at: now,
    used_at: 0,
    status: 1,
    remark: `申请 #${id} 通过发放`,
  };
  const inserted = await db.insertCards([card]);

  const done = await db.reviewCardRequest(id, {
    status: 1,
    cardKey,
    note: note || "已通过，请到「个人设置 → 卡密兑换」入账",
    reviewerId,
    reviewedAt: now,
  });
  if (!done) {
    // 审核落空（并发）→ 吊销刚生成的卡，避免出现无人认领的卡密
    await db.revokeCard(cardKey);
    return json({ code: 409, msg: "该申请刚刚已被处理，请刷新", data: null }, 409, false);
  }

  await logCard({
    card_key: inserted[0] ?? cardKey,
    qq: "",
    action: "request_approve",
    ip: ipOf(request),
    request_id: "",
    detail: `id=${id} user=${req.user_id} plan=${plan} days=${days} quota=${quota} by=${reviewerId}`,
  });

  const fresh = await db.getCardRequest(id);
  return ok(
    { row: fresh ? cardRequestView(fresh) : null, cardKey },
    "已通过并自动发放卡密"
  );
}
