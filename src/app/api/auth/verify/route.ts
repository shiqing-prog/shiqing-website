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

  // 过期检查：24 小时有效（VERIFY_TOKEN_TTL_MS），过期则清除 token 并提示重发
  const expiresAt = user.verify_token_expires
    ? new Date(user.verify_token_expires).getTime()
    : null;
  if (expiresAt === null || expiresAt < Date.now()) {
    await db.setUserVerifyToken(user.id, null, null);
    return NextResponse.json(
      { error: "验证链接已过期，请重新发送验证邮件" },
      { status: 400 }
    );
  }

  await db.markEmailVerified(user.id);
  return NextResponse.json({ ok: true });
}
