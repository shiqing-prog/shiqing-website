import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { serverError } from "@/lib/http";
import { isValidShortCode } from "@/lib/shortlink";

/** DELETE /api/links/[code] —— 删除自己的短链（管理员可删任意） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { code } = await params;
  if (!isValidShortCode(code)) {
    return NextResponse.json({ error: "短码不存在" }, { status: 404 });
  }

  try {
    const db = await getDb();
    const link = await db.getShortLink(code);
    if (!link) return NextResponse.json({ error: "短码不存在" }, { status: 404 });
    if (link.created_by !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "无权删除别人的短链" }, { status: 403 });
    }
    const ok = await db.deleteShortLink(code, link.created_by);
    if (!ok) return NextResponse.json({ error: "删除失败，请刷新后重试" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("links.delete", err);
  }
}
