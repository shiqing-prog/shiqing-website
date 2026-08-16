import { NextResponse } from "next/server";
import { getPosts, createPost } from "@/lib/store";
import type { PostInput } from "@/lib/types";

export async function GET() {
  const posts = await getPosts();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostInput;
    const post = await createPost(body);
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
