import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** GET /api/users/search?q=昵称 —— @提及自动补全（只返回公开字段） */
export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`user-search:${clientIp(request)}`, 200, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 30);
  const db = await getDb();
  const users = await db.searchUsers(q, 8);
  return NextResponse.json({ users });
}
