import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, uid } from "@/lib/data";
import {
  hashPassword,
  isValidEmail,
  newSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  toPublicUser,
} from "@/lib/auth";
import type { RegisterInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterInput;
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const nickname = (body.nickname ?? "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }
    if (!nickname || nickname.length > 20) {
      return NextResponse.json(
        { error: "昵称不能为空且不超过 20 字" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existing = await db.getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }

    const user = {
      id: uid(),
      email,
      password_hash: await hashPassword(password),
      nickname,
      bio: "",
      role: "user" as const,
      created_at: new Date().toISOString(),
    };
    await db.createUser(user);

    // 自动登录
    const token = newSessionToken();
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await db.createSession({
      token,
      user_id: user.id,
      expires_at: expires.toISOString(),
      created_at: new Date().toISOString(),
    });

    const res = NextResponse.json(
      { user: toPublicUser(user) },
      { status: 201 }
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "注册失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
