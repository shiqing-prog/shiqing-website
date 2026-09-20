import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

/** POST /api/replies/[id]/like —— 回复点赞 / 取消点赞 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const { id } = await params;
    const db = await getDb();
    const reply = await db.getReply(id);
    if (!reply) return NextResponse.json({ error: "回复不存在" }, { status: 404 });
    const result = await db.toggleReplyLike(id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
