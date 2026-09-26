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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const reply = await db.getReply(id);
  if (!reply) return NextResponse.json({ error: "回复不存在" }, { status: 404 });
  if (reply.author_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "无权删除" }, { status: 403 });
  }

  // deleteReply 会连子回复与其点赞一起清理
  await db.deleteReply(id);
  return NextResponse.json({ ok: true });
}
