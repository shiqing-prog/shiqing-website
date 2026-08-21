import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser, toPublicUser } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const body = (await request.json()) as { nickname?: string; bio?: string };
    const nickname = (body.nickname ?? "").trim();
    const bio = (body.bio ?? "").trim();

    if (!nickname || nickname.length > 20) {
      return NextResponse.json({ error: "昵称不能为空且不超过 20 字" }, { status: 400 });
    }
    if (bio.length > 200) {
      return NextResponse.json({ error: "简介不超过 200 字" }, { status: 400 });
    }

    const db = await getDb();
    const updated = await db.updateUserProfile(user.id, { nickname, bio });
    if (!updated) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    return NextResponse.json({ user: toPublicUser(updated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
