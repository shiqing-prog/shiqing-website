import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const boardId = search.get("board") ?? undefined;
  const authorId = search.get("author") ?? undefined;
  const q = search.get("q") ?? undefined;
  const tag = search.get("tag") ?? undefined;
  const sort = search.get("sort") === "hot" ? "hot" : undefined;
  const page = Number(search.get("page") ?? 1);
  const db = await getDb();
  const data = await db.listPosts({ boardId, authorId, q, tag, sort, page, pageSize: 20 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      board_id?: string;
      title?: string;
      content?: string;
      attachments?: string[];
      tags?: string[];
    };
    const boardId = (body.board_id ?? "").trim();
    const title = (body.title ?? "").trim();
    const content = (body.content ?? "").trim();
    const attachments = Array.isArray(body.attachments)
      ? body.attachments.filter((x) => typeof x === "string" && x.length > 0).slice(0, 10)
      : [];
    const tags = Array.isArray(body.tags)
      ? body.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];

    if (!boardId) return NextResponse.json({ error: "请选择板块" }, { status: 400 });
    if (!title || title.length > 100)
      return NextResponse.json({ error: "标题不能为空且不超过 100 字" }, { status: 400 });
    if (!content || content.length > 20000)
      return NextResponse.json({ error: "内容不能为空且不超过 20000 字" }, { status: 400 });

    const db = await getDb();
    const board = await db.getBoard(boardId);
    if (!board) return NextResponse.json({ error: "板块不存在" }, { status: 404 });

    // 校验附件文件存在
    const validAttachments: string[] = [];
    if (attachments.length) {
      const files = await db.getFilesByIds(attachments);
      validAttachments.push(...files.map((f) => f.id));
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
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "发帖失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
