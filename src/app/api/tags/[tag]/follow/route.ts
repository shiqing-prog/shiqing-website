import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { serverError } from "@/lib/http";

/** 标签名统一：去 # 前缀、去空白、限长 */
function normalizeTag(raw: string): string {
  return decodeURIComponent(raw).replace(/^#+/, "").trim().slice(0, 30);
}

/** GET /api/tags/<tag>/follow —— 我是否关注了该标签 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ following: false });
  const { tag } = await params;
  const name = normalizeTag(tag);
  if (!name) return NextResponse.json({ following: false });
  try {
    const db = await getDb();
    return NextResponse.json({ following: await db.isTagFollowed(user.id, name) });
  } catch (err) {
    return serverError("tags.follow.get", err);
  }
}

/** POST /api/tags/<tag>/follow —— 关注 / 取消关注 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { tag } = await params;
  const name = normalizeTag(tag);
  if (!name) return NextResponse.json({ error: "标签不正确" }, { status: 400 });

  try {
    const db = await getDb();
    const result = await db.toggleTagFollow(user.id, name);
    return NextResponse.json(result);
  } catch (err) {
    return serverError("tags.follow.toggle", err);
  }
}
