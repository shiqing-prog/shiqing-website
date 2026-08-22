import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      oldPassword?: string;
      newPassword?: string;
    };
    const oldPassword = body.oldPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
    }

    const db = await getDb();
    const full = await db.getUserById(user.id);
    if (!full) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    if (!(await verifyPassword(oldPassword, full.password_hash))) {
      return NextResponse.json({ error: "旧密码不正确" }, { status: 400 });
    }

    await db.updateUserPassword(user.id, await hashPassword(newPassword));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "修改失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
