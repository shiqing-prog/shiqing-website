import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser, newSessionToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // 防邮件轰炸：每用户 10 分钟内最多 5 次重发
  const limited = checkRateLimit(`resend-verify:${user.id}`, 5, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "操作太频繁，请稍后再试" },
      { status: 429 }
    );
  }

  const db = await getDb();
  const full = await db.getUserById(user.id);
  if (!full) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  if (full.email_verified) {
    return NextResponse.json({ ok: true, already: true });
  }

  const verifyToken = newSessionToken();
  await db.setUserVerifyToken(user.id, verifyToken);
  const verifyUrl = `https://shiqing.site/verify?token=${verifyToken}`;

  const { sendMail } = await import("@/lib/mailer");
  const mailSent = await sendMail({
    to: full.email,
    subject: "验证你的邮箱 - ShiQing 时倾",
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2>重新验证邮箱</h2>
      <p>请点击按钮验证你的邮箱：</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${verifyUrl}" style="background:#007cba;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none">验证邮箱</a>
      </p>
      <p style="color:#888;font-size:13px"><a href="${verifyUrl}">${verifyUrl}</a></p>
    </div>`,
    text: `请点击链接验证邮箱：${verifyUrl}`,
  });

  if (!mailSent) {
    return NextResponse.json(
      { error: "邮件发送失败，请稍后再试或检查邮箱配置" },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
