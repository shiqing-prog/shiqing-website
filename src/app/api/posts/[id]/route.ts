import { NextResponse } from "next/server";
import { updatePost, deletePost } from "@/lib/store";
import type { PostInput } from "@/lib/types";

export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/posts/[id]">
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as PostInput;
    const post = await updatePost(id, body);
    return NextResponse.json(post);
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/posts/[id]">
) {
  try {
    const { id } = await params;
    await deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
