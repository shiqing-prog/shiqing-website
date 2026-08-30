import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

/** GET /api/messages/[userId] —— 与某人的对话（拉取后自动标记已读） */
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

    const messages = await db.listMessages(user.id, userId);
    await db.markConversationRead(user.id, userId);
    return NextResponse.json({
      messages,
      other: { id: other.id, nickname: other.nickname },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
