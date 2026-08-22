import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const db = await getDb();
  const [notifications, unread] = await Promise.all([
    db.listNotifications(user.id),
    db.unreadNotificationCount(user.id),
  ]);
  return NextResponse.json({ notifications, unread });
}
