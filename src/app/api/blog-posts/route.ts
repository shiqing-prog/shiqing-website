import { NextResponse, type NextRequest } from "next/server";
import { getPosts } from "@/lib/content";
import { createPost } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import type { BlogPostInput } from "@/lib/types";

export async function GET() {
  const posts = getPosts();
  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 });

  try {
    const body = (await request.json()) as BlogPostInput;
    const post = await createPost(body);
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
