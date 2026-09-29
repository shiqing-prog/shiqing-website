import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { ok, requireAdmin } from "@/lib/cardServer";

/**
 * GET /api/card/stats —— 卡密汇总统计（管理员）
 * 鉴权：管理员登录态 或 Bearer <CARD_ADMIN_TOKEN>
 */
export async function GET(_request: NextRequest) {
  const denied = await requireAdmin(_request);
  if (denied) return denied;

  const db = await getDb();
  return ok(await db.cardStats());
}
