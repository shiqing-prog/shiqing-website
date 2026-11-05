import { NextResponse, type NextRequest } from "next/server";
import { asString, readJsonBody, serverError } from "@/lib/http";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

/** GET /api/bookmarks —— 我的稍后读列表 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const db = await getDb();
    const posts = await db.listBookmarks(user.id);
    return NextResponse.json({ posts, unread: posts.filter((p) => !p.bookmark_read_at).length });
  } catch (err) {
    return serverError("bookmarks.list", err);
  }
}

/** POST /api/bookmarks —— 加入 / 移出稍后读，body: { postId } */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  const postId = asString(body.postId, 64);
  if (!postId) return NextResponse.json({ error: "缺少帖子 id" }, { status: 400 });

  try {
    const db = await getDb();
    const post = await db.getPost(postId);
    if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    const result = await db.toggleBookmark(user.id, postId);
    return NextResponse.json(result);
  } catch (err) {
    return serverError("bookmarks.toggle", err);
  }
}

/** PATCH /api/bookmarks —— 标记已读，body: { postId } */
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  const postId = asString(body.postId, 64);
  if (!postId) return NextResponse.json({ error: "缺少帖子 id" }, { status: 400 });

  try {
    const db = await getDb();
    await db.markBookmarkRead(user.id, postId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("bookmarks.read", err);
  }
}
