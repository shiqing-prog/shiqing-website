import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { cardRequestView } from "@/lib/card";
import { ok, requireAdmin } from "@/lib/cardServer";

/**
 * GET /api/card/request/list?page=1&size=20&status= —— 卡密申请列表（管理员）
 * 鉴权：管理员登录态 或 Bearer <CARD_ADMIN_TOKEN>
 * status 省略 = 全部；0 待审核 / 1 已通过 / 2 已拒绝
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const size = Math.min(100, Math.max(1, Number(params.get("size") ?? 20) || 20));
  const statusRaw = params.get("status");
  const status =
    statusRaw === "0" ? 0 : statusRaw === "1" ? 1 : statusRaw === "2" ? 2 : undefined;

  const db = await getDb();
  const { rows, total } = await db.listCardRequests({ page, pageSize: size, status });
  // 「待审核」总数单独查一次（列表可能正按其它状态过滤）
  const { total: pending } = await db.listCardRequests({
    page: 1,
    pageSize: 1,
    status: 0,
  });

  return ok({
    page,
    size,
    total,
    pending,
    rows: rows.map(cardRequestView),
  });
}
