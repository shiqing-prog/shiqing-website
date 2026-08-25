import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "缺少验证 token" }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.getUserByVerifyToken(token);
  if (!user) {
    return NextResponse.json(
      { error: "验证链接无效或已过期" },
      { status: 400 }
    );
  }
  if (user.email_verified) {
    return NextResponse.json({ ok: true, already: true });
  }

  await db.markEmailVerified(user.id);
  return NextResponse.json({ ok: true });
}
