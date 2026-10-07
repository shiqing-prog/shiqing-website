import { NextResponse, type NextRequest } from "next/server";
import { serverError } from "@/lib/http";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

/** POST /api/posts/[id]/poll —— 对投票贴投一票（每用户一票，不可改投） */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // 限流：防止接口被刷
  const rl = await checkRateLimit(`poll:${user.id}`, 60, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "操作过于频繁，请稍后再试" }, { status: 429 });

  try {
    const { id } = await params;
    const body = (await request.json()) as { choice?: number };
    const choice = Number(body.choice);
    const db = await getDb();
    const post = await db.getPost(id);
    if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });

    const result = await db.castPollVote(id, user.id, choice);
    if (!result) {
      return NextResponse.json({ error: "该帖没有投票或选项无效" }, { status: 400 });
    }
    const latest = await db.getPollResult(id, user.id);
    if (result.already) {
      return NextResponse.json(
        { error: "你已经投过票了", ...result, result: latest },
        { status: 409 }
      );
    }
    return NextResponse.json({ ...result, result: latest });
  } catch (err) {
    return serverError("poll.vote", err);
  }
}
