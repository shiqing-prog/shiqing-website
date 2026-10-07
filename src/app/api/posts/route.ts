import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import type { NextRequest } from "next/server";
import { getDb, uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { extractMentions, resolveMention } from "@/lib/mentions";
import { notifyByEmail } from "@/lib/notify";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const boardId = search.get("board") ?? undefined;
  const authorId = search.get("author") ?? undefined;
  const q = search.get("q") ?? undefined;
  const tag = search.get("tag") ?? undefined;
  const sort = search.get("sort") === "hot" ? "hot" : undefined;
  const page = Number(search.get("page") ?? 1);
  // 管理后台需要一次拉更多（上限 50，与数据层的 pageSize 上限一致）
  const pageSize = Math.min(Math.max(Number(search.get("pageSize") ?? 20) || 20, 1), 50);
  const db = await getDb();
  const data = await db.listPosts({ boardId, authorId, q, tag, sort, page, pageSize });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  // 限流：防止刷帖，同时避免邮件通知被无限放大（每次发帖会给被提及者逐一发信）
  const rl = await checkRateLimit(`post:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "发帖过于频繁，请稍后再试" }, { status: 429 });
  }
  try {
    const body = (await request.json()) as {
      board_id?: string;
      title?: string;
      content?: string;
      attachments?: string[];
      tags?: string[];
      poll?: string[];
    };
    const boardId = (body.board_id ?? "").trim();
    const title = (body.title ?? "").trim();
    const content = (body.content ?? "").trim();
    const attachments = Array.isArray(body.attachments)
      ? body.attachments.filter((x) => typeof x === "string" && x.length > 0).slice(0, 10)
      : [];
    // 标签：去空白、限长（防超长字符串撑大存储/搜索）、去重、最多 5 个
    const tags = Array.isArray(body.tags)
      ? Array.from(
          new Set(
            body.tags
              .map((t) => String(t).trim().slice(0, 30))
              .filter(Boolean)
          )
        ).slice(0, 5)
      : [];
    // 投票贴选项：2-6 项，每项 1-50 字
    const poll = Array.isArray(body.poll)
      ? body.poll
          .map((o) => String(o ?? "").trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];
    if (poll.length === 1) {
      return NextResponse.json(
        { error: "投票至少需要 2 个选项" },
        { status: 400 }
      );
    }
    for (const o of poll) {
      if (o.length > 50) {
        return NextResponse.json({ error: "每个投票选项不超过 50 字" }, { status: 400 });
      }
    }

    if (!boardId) return NextResponse.json({ error: "请选择板块" }, { status: 400 });
    if (!title || title.length > 100)
      return NextResponse.json({ error: "标题不能为空且不超过 100 字" }, { status: 400 });
    if (!content || content.length > 20000)
      return NextResponse.json({ error: "内容不能为空且不超过 20000 字" }, { status: 400 });

    const db = await getDb();
    const board = await db.getBoard(boardId);
    if (!board) return NextResponse.json({ error: "板块不存在" }, { status: 404 });

    // 校验附件：必须存在，且**必须是自己上传的文件**
    // （否则可以引用他人文件 id 发帖，再删帖触发附件清理，从而删除他人文件）
    const validAttachments: string[] = [];
    if (attachments.length) {
      const files = await db.getFilesByIds(attachments);
      validAttachments.push(
        ...files.filter((f) => f.uploader_id === user.id).map((f) => f.id)
      );
    }

    const now = new Date().toISOString();
    const post = {
      id: uid(),
      board_id: boardId,
      author_id: user.id,
      title,
      content,
      created_at: now,
      updated_at: now,
      attachments: validAttachments,
      tags,
    };
    await db.createPost(post);
    if (poll.length >= 2) {
      await db.createPoll(post.id, poll);
    }

    // @提及通知
    for (const name of extractMentions(content)) {
      const target = await resolveMention(name, (n) => db.getUserByNickname(n));
      if (target && target.id !== user.id) {
        await db.createNotification({
          id: uid(),
          user_id: target.id,
          actor_id: user.id,
          type: "mention",
          post_id: post.id,
          reply_id: null,
          content: content.slice(0, 80),
          is_read: 0,
          created_at: now,
        });
        await notifyByEmail(
          target.id,
          `${user.nickname} 在帖子中提到了你`,
          `《${title}》：${content.slice(0, 120)}`,
          `/bbs/post/${post.id}`
        );
      }
    }

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    return serverError("posts.create", err);
  }
}
