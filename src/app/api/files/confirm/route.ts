import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { verifyTicket } from "@/lib/fileticket";
import { checkRateLimit } from "@/lib/ratelimit";

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

/**
 * POST /api/files/confirm —— 上传完成后登记文件元数据
 *
 * 背景：/api/files/ticket 只签发凭证，不再建 files 行；客户端在
 * upload-complete 成功后带 ticket 调这里，校验 HMAC 归属后才落元数据，
 * 从流程上消除「只领凭证、从不上传」的孤儿记录。
 *
 * 幂等：同一 ticket 重复确认时，若 files 行已存在直接返回成功。
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const rl = await checkRateLimit(`file-confirm:${user.id}`, 120, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "操作过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { ticket?: string };
    const ticket = (body.ticket ?? "").trim();
    if (!ticket) {
      return NextResponse.json({ error: "缺少上传凭证" }, { status: 400 });
    }

    const payload = await verifyTicket(ticket);
    if (!payload) {
      return NextResponse.json({ error: "上传凭证无效" }, { status: 400 });
    }
    // 凭证必须属于当前登录用户，防止拿别人的凭证登记
    if (String(payload.uid ?? "") !== user.id) {
      return NextResponse.json({ error: "上传凭证不属于当前账号" }, { status: 403 });
    }

    const id = String(payload.id ?? "").trim();
    const filename = String(payload.filename ?? "").trim().slice(0, 200);
    const size = Number(payload.size ?? 0);
    const mime = String(payload.mime ?? "application/octet-stream").slice(0, 200);

    if (!id || !filename) {
      return NextResponse.json({ error: "上传凭证字段缺失" }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_SIZE) {
      return NextResponse.json({ error: "文件大小无效" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.getFile(id);
    if (!existing) {
      await db.createFile({
        id,
        filename,
        size,
        mime,
        uploader_id: user.id,
        created_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ ok: true, fileId: id });
  } catch (err) {
    return serverError("files.confirm", err);
  }
}
