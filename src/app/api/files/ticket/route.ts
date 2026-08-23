import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { signTicket, getFileBase } from "@/lib/fileticket";

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      filename?: string;
      size?: number;
      mime?: string;
    };
    const filename = (body.filename ?? "").trim();
    const size = Number(body.size ?? 0);

    if (!filename || filename.length > 255) {
      return NextResponse.json({ error: "文件名无效" }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_SIZE) {
      return NextResponse.json(
        { error: "文件大小无效（最大 1GB）" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const id = uid();
    const createdAt = new Date().toISOString();

    // 记录元数据
    await db.createFile({
      id,
      filename,
      size,
      mime: (body.mime ?? "application/octet-stream").slice(0, 200),
      uploader_id: user.id,
      created_at: createdAt,
    });

    // 签发上传凭证（10 分钟有效）
    const ticket = await signTicket({
      id,
      filename,
      size,
      exp: Date.now() + 10 * 60 * 1000,
    });

    const base = await getFileBase();
    return NextResponse.json(
      {
        ticket,
        fileId: id,
        uploadUrl: `${base}/upload`,
        downloadUrl: `${base}/download/${id}`,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取上传凭证失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
