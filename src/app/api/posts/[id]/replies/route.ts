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
    const body = (await request.json()) as {
      content?: string;
      parent_id?: string;
    };
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

    // 楼中楼：校验父回复存在且属于本帖子
    let replyToUserId: string | null = null;
    if (body.parent_id) {
      const parent = await db.getReply(body.parent_id);
      if (!parent || parent.post_id !== id) {
        return NextResponse.json({ error: "父回复不存在" }, { status: 400 });
      }
      replyToUserId = parent.author_id;
    }

    const reply = {
      id: uid(),
      post_id: id,
      author_id: user.id,
      content,
      created_at: new Date().toISOString(),
      parent_id: body.parent_id ?? null,
      reply_to_user_id: replyToUserId,
    };
    await db.createReply(reply);

    // 通知：楼主（自己回自己不通知）+ 被回复人（若不同于楼主且不是自己），去重
    const notifyIds = new Set<string>();
    if (post.author_id !== user.id) notifyIds.add(post.author_id);
    if (replyToUserId && replyToUserId !== user.id) notifyIds.add(replyToUserId);
    for (const userId of notifyIds) {
      await db.createNotification({
        id: uid(),
        user_id: userId,
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
