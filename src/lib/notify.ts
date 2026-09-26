import { getDb } from "./data";
import { sendMail } from "./mailer";

/**
 * 邮件通知：仅当接收者开启了"邮件提醒"时发送（失败静默，不影响主流程）
 * 用于回复、@提及 等需要邮件触达的场景
 */
export async function notifyByEmail(
  userId: string,
  subject: string,
  text: string,
  link?: string
): Promise<void> {
  try {
    const db = await getDb();
    const user = await db.getUserById(userId);
    if (!user || !user.notify_email || !user.email) return;
    const url = link ? `https://shiqing.site${link}` : "https://shiqing.site";
    await sendMail({
      to: user.email,
      subject,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="font-size:18px">${subject}</h2>
        <p style="line-height:1.7">${text}</p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#4f46e5;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none">查看详情</a>
        </p>
        <p style="color:#999;font-size:12px">你可以在「账户设置」中关闭邮件提醒。</p>
      </div>`,
      text: `${text}\n\n查看详情：${url}`,
    });
  } catch {
    /* 邮件失败不影响主流程 */
  }
}
