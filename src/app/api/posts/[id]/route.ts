import { NextResponse } from "next/server";
import { asString, readJsonBody, serverError } from "@/lib/http";
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
    const body = await readJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
    }
    const title = asString(body.title, 200);
    const content = asString(body.content, 40000);

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
    return serverError("posts.update", err);
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
  const attachmentIds = post.attachments ?? [];
  const attachmentFiles = attachmentIds.length
    ? await db.getFilesByIds(attachmentIds)
    : [];
  await db.deletePost(id);

  // 清理关联附件（本机文件 + 元数据）
  // 安全约束：只删除「帖子作者自己上传」且「已无任何引用（其它帖子附件 / 用户头像）」的文件，
  // 避免删除别人上传的文件或仍被头像/其它帖子引用的共享文件
  if (attachmentFiles.length) {
    try {
      const base = await getFileBase();
      for (const f of attachmentFiles) {
        if (f.uploader_id !== post.author_id) continue;
        // 帖子已删除，此时剩下的引用都来自其它位置
        if ((await db.countFileReferences(f.id)) > 0) continue;
        try {
          const ticket = await signTicket({ id: f.id, exp: Date.now() + 60 * 1000 });
          const res = await fetch(`${base}/file/${f.id}?ticket=${ticket}`, {
            method: "DELETE",
          });
          // 物理文件删不掉（4xx/5xx）就保留元数据：否则文件变成永久占空间的孤儿，
          // 数据库里再也查不到它。
          if (!res.ok && res.status !== 404) {
            console.error("[posts.delete] 附件物理删除失败，保留元数据", f.id, res.status);
            continue;
          }
        } catch {
          // 本机不可达：同样保留元数据，等文件服务恢复后还能清
          console.error("[posts.delete] 文件服务不可达，保留附件元数据", f.id);
          continue;
        }
        await db.deleteFile(f.id);
      }
    } catch {
      /* 忽略清理错误 */
    }
  }
  return NextResponse.json({ ok: true });
}
