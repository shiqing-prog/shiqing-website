import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import {
  getSessionUser,
  hashPassword,
  newSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

export async function PUT(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // 限流：防止持有会话者暴力猜旧密码
  const rl = await checkRateLimit(`password:${user.id}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "尝试次数过多，请稍后再试" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      oldPassword?: string;
      newPassword?: string;
    };
    const oldPassword = body.oldPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "新密码至少 8 位" }, { status: 400 });
    }

    const db = await getDb();
    const full = await db.getUserById(user.id);
    if (!full) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    if (!(await verifyPassword(oldPassword, full.password_hash))) {
      return NextResponse.json({ error: "旧密码不正确" }, { status: 400 });
    }

    await db.updateUserPassword(user.id, await hashPassword(newPassword));

    // 安全：改密后让其它设备的会话全部失效（被盗 Cookie 不再有效），
    // 同时为当前设备续签一个新会话，避免把本人也踢下线
    await db.deleteUserSessions(user.id);
    const token = newSessionToken();
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await db.createSession({
      token,
      user_id: user.id,
      expires_at: expires.toISOString(),
      created_at: new Date().toISOString(),
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
    return res;
  } catch (err) {
    return serverError("password", err);
  }
}
