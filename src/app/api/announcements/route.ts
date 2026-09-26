import { NextResponse, type NextRequest } from "next/server";
import { getDb, uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

/** GET /api/announcements —— 有效公告列表（公开） */
export async function GET() {
  const db = await getDb();
  const list = await db.listAnnouncements(true);
  return NextResponse.json({ announcements: list });
}

/** POST /api/announcements —— 发布公告（仅管理员） */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as {
      content?: string;
      /** 有效小时数（不传或 0 表示长期有效） */
      hours?: number;
    };
    const content = (body.content ?? "").trim();
    if (!content || content.length > 500) {
      return NextResponse.json(
        { error: "公告内容不能为空且不超过 500 字" },
        { status: 400 }
      );
    }
    const hours = Number(body.hours) || 0;
    const now = new Date();
    const announcement = {
      id: uid(),
      content,
      created_at: now.toISOString(),
      expires_at:
        hours > 0 ? new Date(now.getTime() + hours * 3600 * 1000).toISOString() : null,
    };
    const db = await getDb();
    await db.createAnnouncement(announcement);
    return NextResponse.json(announcement, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "发布失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
