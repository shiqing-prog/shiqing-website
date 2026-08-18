import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

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
  return NextResponse.json({ post: { ...post, board_name: board?.name }, replies });
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
  return NextResponse.json({ ok: true });
}
