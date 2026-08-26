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
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  // 限流：同一 IP 10 分钟内最多注册 5 次
  const rl = checkRateLimit(`register:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "注册太频繁，请稍后再试" },
      { status: 429 }
    );
  }
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

    // 邮箱验证：由 VERIFY_EMAIL 开关控制（当前关闭则不发送验证邮件）
    let mailSent = false;
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { env } = await getCloudflareContext({ async: true });
      const verifyEnabled =
        (env as unknown as { VERIFY_EMAIL?: string }).VERIFY_EMAIL === "true";
      if (verifyEnabled) {
        const verifyToken = newSessionToken();
        await db.setUserVerifyToken(user.id, verifyToken);
        const verifyUrl = `https://shiqing.site/verify?token=${verifyToken}`;
        const { sendMail } = await import("@/lib/mailer");
        mailSent = await sendMail({
          to: email,
          subject: "验证你的邮箱 - ShiQing 时倾",
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2>欢迎注册 ShiQing 时倾 🎉</h2>
            <p>请点击下方按钮验证你的邮箱：</p>
            <p style="text-align:center;margin:28px 0">
              <a href="${verifyUrl}" style="background:#007cba;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none">验证邮箱</a>
            </p>
            <p style="color:#888;font-size:13px">如果按钮无法点击，请复制以下链接到浏览器打开：<br><a href="${verifyUrl}">${verifyUrl}</a></p>
            <p style="color:#aaa;font-size:12px">如果这不是你注册的，请忽略此邮件。</p>
          </div>`,
          text: `欢迎注册 ShiQing 时倾，请点击链接验证邮箱：${verifyUrl}`,
        });
      }
    } catch {
      mailSent = false;
    }

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
      {
        user: { ...toPublicUser(user), email_verified: 0 },
        mailSent,
      },
      { status: 201 }
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "注册失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
