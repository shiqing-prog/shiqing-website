import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // 限流：防止刷赞/刷通知
  const rl = await checkRateLimit(`like:${user.id}`, 120, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "操作过于频繁，请稍后再试" }, { status: 429 });

  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });

  const result = await db.toggleLike(id, user.id);
  return NextResponse.json(result);
}
