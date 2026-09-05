import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

/** GET /api/signin —— 签到状态（今天是否已签 / 连续天数 / 总天数） */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const db = await getDb();
  const stats = await db.getSignStats(user.id);
  return NextResponse.json(stats);
}

/** POST /api/signin —— 每日签到（Asia/Shanghai 时区） */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const db = await getDb();
    const result = await db.signToday(user.id);
    if (result.already) {
      return NextResponse.json({ ...result, message: "今天已经签过啦" });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "签到失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
