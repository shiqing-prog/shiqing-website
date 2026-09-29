import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { cardPublicView } from "@/lib/card";
import { json, ok, requireAdmin } from "@/lib/cardServer";

/**
 * GET /api/card/info?key=xxx —— 查看单张卡密详情（管理员）
 * 鉴权：管理员登录态 或 Bearer <CARD_ADMIN_TOKEN>
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const key = (request.nextUrl.searchParams.get("key") ?? "").trim();
  if (!key) return json({ code: 400, msg: "key required", data: null }, 400, false);

  const db = await getDb();
  const card = await db.getCardByKey(key);
  if (!card) return json({ code: 0, msg: "not_found", data: null }, 200, false);

  return ok(cardPublicView(card));
}
