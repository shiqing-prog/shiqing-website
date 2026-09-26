import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { hashPassword } from "@/lib/auth";

/** POST /api/auth/reset —— 用重置 token 设置新密码（成功后清会话，强制重新登录） */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const token = (body.token ?? "").trim();
    const password = body.password ?? "";
    if (!token) {
      return NextResponse.json({ error: "缺少重置凭证" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.getUserByResetToken(token);
    if (!user) {
      return NextResponse.json({ error: "重置链接无效或已使用" }, { status: 400 });
    }
    const expiresAt = user.reset_token_expires
      ? new Date(user.reset_token_expires).getTime()
      : null;
    if (expiresAt === null || expiresAt < Date.now()) {
      await db.setUserResetToken(user.id, null, null);
      return NextResponse.json(
        { error: "重置链接已过期，请重新申请" },
        { status: 400 }
      );
    }

    await db.updateUserPassword(user.id, await hashPassword(password));
    await db.setUserResetToken(user.id, null, null);
    // 安全：重置后清空全部登录会话
    await db.deleteUserSessions(user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "重置失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
