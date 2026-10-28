import { getCloudflareContext } from "@opennextjs/cloudflare";

/** 发送邮件：经本机 mail 服务（mail.shiqing.site 隧道）转发 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const e = env as unknown as {
      MAILER_SECRET?: string;
      MAILER_BASE?: string;
    };
    const secret = e.MAILER_SECRET;
    const base = e.MAILER_BASE ?? "https://mail.shiqing.site";
    if (!secret) return false; // 未配置邮件服务
    // 超时预算：mail-relay 或上游 SMTP 卡住时，不能让发帖/回帖请求被拖到
    // Cloudflare 的请求上限（nodemailer 默认 connectionTimeout 是 2 分钟）。
    const res = await fetch(`${base}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mailer-secret": secret,
      },
      body: JSON.stringify(opts),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.error(`[mailer] 发送失败 HTTP ${res.status}: ${res.statusText}`);
    }
    return res.ok;
  } catch (err) {
    console.error("[mailer] 发送异常:", err);
    return false;
  }
}
