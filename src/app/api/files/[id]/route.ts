import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { signTicket, getFileBase } from "@/lib/fileticket";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const file = await db.getFile(id);
  if (!file) return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  if (file.uploader_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "无权删除" }, { status: 403 });
  }

  // 签发删除凭证并通知本机文件服务删除物理文件（尽力而为）
  try {
    const ticket = await signTicket({ id, exp: Date.now() + 60 * 1000 });
    const base = await getFileBase();
    await fetch(`${base}/file/${id}?ticket=${ticket}`, { method: "DELETE" });
  } catch {
    /* 本机服务不可达时，仅删元数据 */
  }

  await db.deleteFile(id);
  return NextResponse.json({ ok: true });
}
