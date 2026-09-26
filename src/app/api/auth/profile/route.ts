import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser, toPublicUser } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      nickname?: string;
      bio?: string;
      /** 头像：文件库文件 id（空字符串/null 表示清除头像） */
      avatar?: string | null;
      /** 邮件通知开关 */
      notifyEmail?: boolean;
    };
    const patch: { nickname?: string; bio?: string; avatar?: string | null } = {};

    if (body.nickname !== undefined) {
      const nickname = (body.nickname ?? "").trim();
      if (!nickname || nickname.length > 20) {
        return NextResponse.json({ error: "昵称不能为空且不超过 20 字" }, { status: 400 });
      }
      patch.nickname = nickname;
    }
    if (body.bio !== undefined) {
      const bio = (body.bio ?? "").trim();
      if (bio.length > 200) {
        return NextResponse.json({ error: "简介不超过 200 字" }, { status: 400 });
      }
      patch.bio = bio;
    }
    if (body.avatar !== undefined) {
      const avatar = (body.avatar ?? "").trim();
      if (avatar) {
        // 头像必须是当前用户自己的文件库文件
        const db = await getDb();
        const file = await db.getFile(avatar);
        if (!file) {
          return NextResponse.json({ error: "头像文件不存在" }, { status: 400 });
        }
        if (file.uploader_id !== user.id) {
          return NextResponse.json({ error: "只能使用自己上传的文件作头像" }, { status: 403 });
        }
        patch.avatar = avatar;
      } else {
        patch.avatar = null;
      }
    }
    // 邮件通知开关（独立字段）
    const notifyEmail =
      typeof body.notifyEmail === "boolean" ? body.notifyEmail : null;

    if (Object.keys(patch).length === 0 && notifyEmail === null) {
      return NextResponse.json({ error: "没有可更新的内容" }, { status: 400 });
    }

    const db = await getDb();
    if (notifyEmail !== null) {
      await db.setNotifyEmail(user.id, notifyEmail);
    }
    let updated = await db.getUserById(user.id);
    if (Object.keys(patch).length > 0) {
      updated = await db.updateUserProfile(user.id, patch);
    }
    if (!updated) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    return NextResponse.json({ user: toPublicUser(updated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
