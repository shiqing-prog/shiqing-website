import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { newSessionToken } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 小时有效

/** POST /api/auth/forgot —— 发送密码重置邮件（无论邮箱是否存在都返回成功，防枚举） */
export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`forgot:${clientIp(request)}`, 5, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json({ error: "操作太频繁，请稍后再试" }, { status: 429 });
    }
    const body = (await request.json()) as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "请输入邮箱" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.getUserByEmail(email);

    // 邮箱不存在也返回 ok（不泄露注册状态）
    if (user) {
      const token = newSessionToken();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
      await db.setUserResetToken(user.id, token, expiresAt);
      const resetUrl = `https://shiqing.site/reset?token=${token}`;
      try {
        const { sendMail } = await import("@/lib/mailer");
        await sendMail({
          to: user.email,
          subject: "重置你的密码 - ShiQing 时倾",
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2>重置密码</h2>
            <p>我们收到了你的密码重置请求，点击下方按钮设置新密码（1 小时内有效）：</p>
            <p style="text-align:center;margin:28px 0">
              <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none">重置密码</a>
            </p>
            <p style="color:#888;font-size:13px">如果按钮无法点击，请复制链接到浏览器打开：<br><a href="${resetUrl}">${resetUrl}</a></p>
            <p style="color:#aaa;font-size:12px">如果这不是你本人的操作，请忽略此邮件（你的密码不会改变）。</p>
          </div>`,
          text: `请点击链接重置密码（1 小时内有效）：${resetUrl}`,
        });
      } catch {
        /* 邮件失败不影响返回（防枚举） */
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "请求失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
