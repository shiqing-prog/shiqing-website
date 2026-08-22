import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
  const replies = await db.listReplies(id);
  return NextResponse.json(replies);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const { id } = await params;
    const body = (await request.json()) as { content?: string };
    const content = (body.content ?? "").trim();
    if (!content || content.length > 5000) {
      return NextResponse.json(
        { error: "回复内容不能为空且不超过 5000 字" },
        { status: 400 }
      );
    }
    const db = await getDb();
    const post = await db.getPost(id);
    if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    const reply = {
      id: uid(),
      post_id: id,
      author_id: user.id,
      content,
      created_at: new Date().toISOString(),
    };
    await db.createReply(reply);

    // 通知楼主（自己回复自己的帖子不通知）
    if (post.author_id !== user.id) {
      await db.createNotification({
        id: uid(),
        user_id: post.author_id,
        actor_id: user.id,
        type: "reply",
        post_id: id,
        reply_id: reply.id,
        content: content.slice(0, 80),
        is_read: 0,
        created_at: reply.created_at,
      });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "回复失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
