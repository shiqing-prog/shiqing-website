import { NextResponse, type NextRequest } from "next/server";
import { serverError } from "@/lib/http";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

/** POST /api/replies/[id]/like —— 回复点赞 / 取消点赞 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // 限流：防止接口被刷
  const rl = await checkRateLimit(`reply-like:${user.id}`, 120, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "操作过于频繁，请稍后再试" }, { status: 429 });

  try {
    const { id } = await params;
    const db = await getDb();
    const reply = await db.getReply(id);
    if (!reply) return NextResponse.json({ error: "回复不存在" }, { status: 404 });
    const result = await db.toggleReplyLike(id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    return serverError("replies.like", err);
  }
}
