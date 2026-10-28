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

  // 仍被头像或帖子附件引用的文件不能删（否则会留下悬空引用/裂图）
  const refs = await db.countFileReferences(id);
  if (refs > 0) {
    return NextResponse.json(
      { error: "该文件仍被头像或帖子引用，请先解除引用后再删除" },
      { status: 409 }
    );
  }

  // 签发删除凭证并通知本机文件服务删除物理文件。
  // 注意：只有「明确的 4xx/5xx」才中止——否则元数据删了、物理文件永久残留；
  // 网络完全不可达时仍按原策略只删元数据（避免文件服务长时间离线导致无法清理）。
  try {
    const ticket = await signTicket({ id, exp: Date.now() + 60 * 1000 });
    const base = await getFileBase();
    const res = await fetch(`${base}/file/${id}?ticket=${ticket}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      console.error("[files.delete] 物理文件删除被拒绝", res.status);
      return NextResponse.json(
        { error: "文件服务暂时不可用，请稍后重试" },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[files.delete] 文件服务不可达，仅删除元数据", err);
  }

  await db.deleteFile(id);
  return NextResponse.json({ ok: true });
}
