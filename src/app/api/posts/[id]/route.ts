import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { signTicket, getFileBase } from "@/lib/fileticket";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
  const board = await db.getBoard(post.board_id);
  const replies = await db.listReplies(id);
  // 附件信息（含下载链接）
  const files = await db.getFilesByIds(post.attachments ?? []);
  const base = await getFileBase();
  const attachments = files.map((f) => ({
    ...f,
    url: `${base}/download/${f.id}`,
  }));
  return NextResponse.json({
    post: { ...post, board_name: board?.name },
    replies,
    attachments,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json()) as { title?: string; content?: string };
    const title = (body.title ?? "").trim();
    const content = (body.content ?? "").trim();

    if (!title || title.length > 100)
      return NextResponse.json({ error: "标题不能为空且不超过 100 字" }, { status: 400 });
    if (!content || content.length > 20000)
      return NextResponse.json({ error: "内容不能为空且不超过 20000 字" }, { status: 400 });

    const db = await getDb();
    const post = await db.getPost(id);
    if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    if (post.author_id !== user.id) {
      return NextResponse.json({ error: "只有作者可以编辑" }, { status: 403 });
    }

    const updated = await db.updatePost(id, { title, content });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
  if (post.author_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "无权删除" }, { status: 403 });
  }
  await db.deletePost(id);

  // 清理关联附件（本机文件 + 元数据）
  const attachments = post.attachments ?? [];
  if (attachments.length) {
    try {
      const base = await getFileBase();
      for (const fid of attachments) {
        try {
          const ticket = await signTicket({ id: fid, exp: Date.now() + 60 * 1000 });
          await fetch(`${base}/file/${fid}?ticket=${ticket}`, { method: "DELETE" });
        } catch {
          /* 本机不可达时跳过物理删除 */
        }
        await db.deleteFile(fid);
      }
    } catch {
      /* 忽略清理错误 */
    }
  }
  return NextResponse.json({ ok: true });
}
