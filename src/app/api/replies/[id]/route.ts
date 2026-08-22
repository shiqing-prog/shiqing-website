import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json()) as { content?: string };
    const content = (body.content ?? "").trim();
    if (!content || content.length > 5000) {
      return NextResponse.json(
        { error: "回复内容不能为空且不超过 5000 字" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const reply = await db.getReply(id);
    if (!reply) return NextResponse.json({ error: "回复不存在" }, { status: 404 });
    if (reply.author_id !== user.id) {
      return NextResponse.json({ error: "只有作者可以编辑" }, { status: 403 });
    }

    const updated = await db.updateReply(id, { content });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
