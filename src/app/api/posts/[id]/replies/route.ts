import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { extractMentions, resolveMention } from "@/lib/mentions";
import { notifyByEmail } from "@/lib/notify";
import { checkRateLimit } from "@/lib/ratelimit";

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
  // 限流：防止刷回复，同时避免邮件通知被放大（每条回复都可能触发邮件）
  const rl = checkRateLimit(`reply:${user.id}`, 20, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "回复过于频繁，请稍后再试" }, { status: 429 });
  }
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

    // 楼中楼：校验父回复存在、属于本帖子，且父回复本身是顶层回复（本实现只支持一层嵌套）
    let replyToUserId: string | null = null;
    let parentId: string | null = null;
    if (body.parent_id) {
      const parent = await db.getReply(body.parent_id);
      if (!parent || parent.post_id !== id) {
        return NextResponse.json({ error: "父回复不存在" }, { status: 400 });
      }
      if (parent.parent_id) {
        return NextResponse.json(
          { error: "只支持对顶层回复进行回复" },
          { status: 400 }
        );
      }
      parentId = parent.id;
      replyToUserId = parent.author_id;
    }

    const reply = {
      id: uid(),
      post_id: id,
      author_id: user.id,
      content,
      created_at: new Date().toISOString(),
      parent_id: parentId,
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
      // 邮件提醒（仅接收者开启时发送）
      await notifyByEmail(
        userId,
        `有人回复了《${post.title}》`,
        `${user.nickname} 回复：${content.slice(0, 120)}`,
        `/bbs/post/${id}`
      );
    }

    // @提及通知（排除已通知的楼主/被回复人，避免重复打扰）
    for (const name of extractMentions(content)) {
      const target = await resolveMention(name, (n) => db.getUserByNickname(n));
      if (target && target.id !== user.id && !notifyIds.has(target.id)) {
        await db.createNotification({
          id: uid(),
          user_id: target.id,
          actor_id: user.id,
          type: "mention",
          post_id: id,
          reply_id: reply.id,
          content: content.slice(0, 80),
          is_read: 0,
          created_at: reply.created_at,
        });
        await notifyByEmail(
          target.id,
          `${user.nickname} 在回复中提到了你`,
          content.slice(0, 120),
          `/bbs/post/${id}`
        );
      }
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "回复失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
