import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { serverError } from "@/lib/http";

/**
 * GET /api/posts/<id>/revisions —— 帖子的编辑历史
 *
 * 正文只给作者本人看完整内容；其他人只看到改动统计，避免历史版本成为
 * "删掉了但还是能被翻出来"的擦除漏洞。标题始终可见（便于判断改了什么）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await getDb();
    const post = await db.getPost(id);
    if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });

    const user = await getSessionUser(request);
    const isAuthor = user?.id === post.author_id;
    const isAdmin = user?.role === "admin";
    const revisions = await db.listPostRevisions(id, 50);

    return NextResponse.json({
      canViewContent: isAuthor || isAdmin,
      revisions: revisions.map((r) => ({
        id: r.id,
        title: r.title,
        created_at: r.created_at,
        editor_id: r.editor_id,
        editor_nickname: r.editor_nickname ?? "匿名",
        content: isAuthor || isAdmin ? r.content : null,
        chars: r.content.length,
      })),
    });
  } catch (err) {
    return serverError("posts.revisions", err);
  }
}
