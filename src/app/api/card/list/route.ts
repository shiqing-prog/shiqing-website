import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { cardPublicView } from "@/lib/card";
import { ok, requireAdmin } from "@/lib/cardServer";

/**
 * GET /api/card/list?page=1&size=20&status=&q= —— 卡密列表（管理员）
 * 鉴权：管理员登录态 或 Bearer <CARD_ADMIN_TOKEN>
 * 说明：比参考方案多返回 total，便于前端做分页
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const size = Math.min(100, Math.max(1, Number(params.get("size") ?? 20) || 20));
  const statusRaw = params.get("status");
  const status = statusRaw === "0" ? 0 : statusRaw === "1" ? 1 : undefined;
  const q = params.get("q") ?? undefined;

  const db = await getDb();
  const { rows, total } = await db.listCards({ page, pageSize: size, status, q });

  return ok({
    page,
    size,
    total,
    rows: rows.map(cardPublicView),
  });
}
