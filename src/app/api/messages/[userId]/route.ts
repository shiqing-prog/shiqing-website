import { NextResponse, type NextRequest } from "next/server";
import { serverError } from "@/lib/http";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

/** GET /api/messages/[userId] —— 与某人的对话（拉取后自动标记已读）
 *
 * 支持游标分页：?before=<created_at> 取更早的一页。原先写死只回最近 200 条，
 * 长会话前面翻不到；前端靠 hasMore 决定要不要显示「加载更早」。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const { userId } = await params;
    const db = await getDb();
    const other = await db.getUserById(userId);
    if (!other) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    const sp = request.nextUrl.searchParams;
    const before = sp.get("before") ?? "";
    const rawLimit = Number(sp.get("limit") ?? 50);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 50;

    const { messages, hasMore } = await db.listMessages(user.id, userId, {
      before,
      limit,
    });
    // 只标记已读，不影响翻页
    await db.markConversationRead(user.id, userId);
    return NextResponse.json({
      messages,
      hasMore,
      other: { id: other.id, nickname: other.nickname },
    });
  } catch (err) {
    return serverError("messages.get", err);
  }
}
