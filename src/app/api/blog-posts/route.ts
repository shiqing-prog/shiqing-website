import { NextResponse } from "next/server";
import { getPosts } from "@/lib/content";
import { createPost } from "@/lib/store";
import type { BlogPostInput } from "@/lib/types";

export async function GET() {
  const posts = getPosts();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BlogPostInput;
    const post = await createPost(body);
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
