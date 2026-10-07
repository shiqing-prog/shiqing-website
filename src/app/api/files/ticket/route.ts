import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import type { NextRequest } from "next/server";
import { uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { signTicket, getFileBase } from "@/lib/fileticket";
import { checkRateLimit } from "@/lib/ratelimit";

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
/** 分片大小（必须与前端 lib/chunkedUpload.CHUNK_SIZE 一致） */
const CHUNK_SIZE = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // 限流：每次调用都会签发一张上传凭证
  const rl = await checkRateLimit(`ticket:${user.id}`, 60, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "上传过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      filename?: string;
      size?: number;
      mime?: string;
      chunks?: number;
    };
    // 文件名会透传给本机文件服务用于落盘/展示：去掉路径分隔符与控制字符，防路径穿越
    const filename = (body.filename ?? "")
      .trim()
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .slice(0, 200);
    const size = Number(body.size ?? 0);
    const mime = (body.mime ?? "application/octet-stream").slice(0, 200);

    if (!filename) {
      return NextResponse.json({ error: "文件名无效" }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_SIZE) {
      return NextResponse.json(
        { error: "文件大小无效（最大 2GB）" },
        { status: 400 }
      );
    }

    // 分片数由服务端按大小计算，不再采信前端传入的 chunks（避免脏数据/绕过上限）
    const chunks = Math.max(Math.ceil(size / CHUNK_SIZE), 1);
    const id = uid();

    // 注意：这里**不**落 files 元数据。元数据在客户端上传完成后调用
    // /api/files/confirm 时创建，避免「只领凭证、从不上传」产生孤儿记录。
    const ticket = await signTicket({
      id,
      uid: user.id,
      filename,
      size,
      mime,
      chunks,
      exp: Date.now() + 10 * 60 * 1000, // 10 分钟有效
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
    return serverError("files.ticket", err);
  }
}
