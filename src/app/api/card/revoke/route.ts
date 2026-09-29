import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { ipOf, json, logCard, ok, readJsonBody, requireAdmin } from "@/lib/cardServer";

/**
 * POST /api/card/revoke —— 吊销卡密（管理员）
 * 鉴权：管理员登录态 或 Bearer <CARD_ADMIN_TOKEN>；body: { key }
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await readJsonBody(request);
  const key = String(body.key ?? "").trim();
  if (!key) return json({ code: 400, msg: "key required", data: null }, 400, false);

  const db = await getDb();
  const affected = await db.revokeCard(key);

  await logCard({
    card_key: key,
    qq: "",
    action: "revoke",
    ip: ipOf(request),
    request_id: "",
    detail: `affected=${affected}`,
  });

  return ok({ affected });
}
