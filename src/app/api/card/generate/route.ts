import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import {
  CARD_LIMITS,
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
  preflight,
  readJsonBody,
  requireAdmin,
} from "@/lib/cardServer";
import type { CardRecord } from "@/lib/types";

export function OPTIONS() {
  return preflight(false);
}

/**
 * POST /api/card/generate —— 批量生成卡密（管理员）
 * 鉴权：站点管理员登录态 或 Authorization: Bearer <CARD_ADMIN_TOKEN>
 * body: { prefix?, plan?, count?, days?, quota?, remark?, activate? }
 *   - activate = "immediate" 生成即开始计时；默认 "on_first_use"（首次消费才计时）
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  if (await isRateLimited(`card-generate:${ipOf(request)}`, 60, 10 * 60 * 1000)) {
    return json({ code: 429, msg: "生成过于频繁，请稍后再试", data: null }, 429, false);
  }

  const body = await readJsonBody(request);
  const prefix = sanitizePrefix(body.prefix);
  const plan = sanitizePlan(body.plan);
  const count = clampInt(body.count, CARD_LIMITS.count);
  const days = clampInt(body.days, CARD_LIMITS.days);
  const quota = clampInt(body.quota, CARD_LIMITS.quota);
  const remark = typeof body.remark === "string" ? body.remark.trim().slice(0, 200) : "";
  const immediate = body.activate === "immediate";

  const now = nowSec();
  const expiredAt = immediate ? now + days * 86400 : 0;

  // 生成 count 个互不重复的卡密（重复概率极低，仍然去重）
  const seen = new Set<string>();
  const rows: CardRecord[] = [];
  while (rows.length < count) {
    const key = genKey(prefix, plan);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      card_key: key,
      prefix,
      plan,
      days,
      quota,
      used: 0,
      bound_qq: "",
      bound_user_id: "",
      redeemed_at: 0,
      expired_at: expiredAt,
      created_at: now,
      used_at: 0,
      status: 1,
      remark,
    });
  }

  const db = await getDb();
  const inserted = await db.insertCards(rows);

  await logCard({
    card_key: inserted[0] ?? "",
    qq: "",
    action: "generate",
    ip: ipOf(request),
    request_id: "",
    detail: `count=${inserted.length} prefix=${prefix} plan=${plan} days=${days} quota=${quota} activate=${
      immediate ? "immediate" : "on_first_use"
    }`,
  });

  return ok(
    {
      count: inserted.length,
      keys: inserted,
      prefix,
      plan,
      days,
      quota,
      activate: immediate ? "immediate" : "on_first_use",
    },
    "ok"
  );
}
