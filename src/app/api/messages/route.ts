import { NextResponse, type NextRequest } from "next/server";
import { serverError } from "@/lib/http";
import { getDb, uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

/** GET /api/messages —— 会话列表 + 私信未读数 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const db = await getDb();
  const [conversations, unread] = await Promise.all([
    db.listConversations(user.id),
    db.unreadMessageCount(user.id),
  ]);
  return NextResponse.json({ conversations, unread });
}

/** POST /api/messages —— 发送私信（通知接收者） */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  // 限流：防止用私信骚扰/刷屏（每条私信也会给接收者产生通知）
  const rl = await checkRateLimit(`message:${user.id}`, 30, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "发送过于频繁，请稍后再试" }, { status: 429 });
  }
  try {
    const body = (await request.json()) as { to?: string; content?: string };
    const content = (body.content ?? "").trim();
    const to = (body.to ?? "").trim();
    if (!content || content.length > 2000) {
      return NextResponse.json(
        { error: "私信内容不能为空且不超过 2000 字" },
        { status: 400 }
      );
    }
    if (!to) {
      return NextResponse.json({ error: "缺少接收者" }, { status: 400 });
    }

    const db = await getDb();
    const receiver = await db.getUserById(to);
    if (!receiver) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    if (receiver.id === user.id) {
      return NextResponse.json({ error: "不能给自己发私信" }, { status: 400 });
    }

    const message = {
      id: uid(),
      sender_id: user.id,
      receiver_id: receiver.id,
      content,
      is_read: 0,
      created_at: new Date().toISOString(),
    };
    await db.createMessage(message);

    // 通知接收者（铃铛）
    await db.createNotification({
      id: uid(),
      user_id: receiver.id,
      actor_id: user.id,
      type: "message",
      post_id: null,
      reply_id: null,
      content: content.slice(0, 80),
      is_read: 0,
      created_at: message.created_at,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return serverError("messages.send", err);
  }
}
