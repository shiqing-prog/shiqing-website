import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

/** DELETE /api/psych/results/[id] —— 删除自己的一条测评记录 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const ok = await db.deletePsychResult(id, user.id);
  if (!ok) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
