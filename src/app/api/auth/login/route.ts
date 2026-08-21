import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import {
  newSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  toPublicUser,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  // 限流：同一 IP 10 分钟内最多登录 10 次（防暴力破解）
  const rl = checkRateLimit(`login:${clientIp(request)}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "尝试次数过多，请稍后再试" },
      { status: 429 }
    );
  }
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json(
        { error: "邮箱或密码错误" },
        { status: 401 }
      );
    }

    const token = newSessionToken();
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await db.createSession({
      token,
      user_id: user.id,
      expires_at: expires.toISOString(),
      created_at: new Date().toISOString(),
    });

    const res = NextResponse.json({ user: toPublicUser(user) });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "登录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
