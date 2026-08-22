import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可置顶" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { sticky?: boolean };
    const db = await getDb();
    const post = await db.getPost(id);
    if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });

    const updated = await db.setPostSticky(id, Boolean(body.sticky));
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
