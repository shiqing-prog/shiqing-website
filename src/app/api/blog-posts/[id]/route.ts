import { NextResponse, type NextRequest } from "next/server";
import { updatePost, deletePost } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import type { BlogPostInput } from "@/lib/types";

async function requireAdmin(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return { error: "请先登录", status: 401 as const };
  if (user.role !== "admin") return { error: "仅管理员可操作", status: 403 as const };
  return null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

  try {
    const { id } = await params;
    const body = (await request.json()) as BlogPostInput;
    const post = await updatePost(id, body);
    return NextResponse.json(post);
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

  try {
    const { id } = await params;
    await deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
