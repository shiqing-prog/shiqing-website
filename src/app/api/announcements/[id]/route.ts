import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

/** DELETE /api/announcements/[id] —— 删除公告（仅管理员） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const db = await getDb();
    await db.deleteAnnouncement(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
