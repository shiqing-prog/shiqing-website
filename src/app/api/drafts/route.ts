import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

function parseKind(v: string | null): "new" | "edit" {
  return v === "edit" ? "edit" : "new";
}

/** GET /api/drafts?kind=new|edit&ref_id=帖子id —— 读取我的云端草稿 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const p = request.nextUrl.searchParams;
  const kind = parseKind(p.get("kind"));
  const refId = (p.get("ref_id") ?? "").slice(0, 64);
  const db = await getDb();
  const draft = await db.getDraft(user.id, kind, refId);
  return NextResponse.json({ draft });
}

/** POST /api/drafts —— 保存/覆盖我的云端草稿（内容为空则清除） */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const rl = await checkRateLimit(`draft:${user.id}`, 120, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "保存过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      kind?: string;
      ref_id?: string;
      title?: string;
      content?: string;
    };
    const kind = parseKind(body.kind ?? null);
    const refId = String(body.ref_id ?? "").slice(0, 64);
    const title = String(body.title ?? "").slice(0, 200);
    const content = String(body.content ?? "").slice(0, 30000);
    const db = await getDb();

    if (!title && !content) {
      await db.deleteDraft(user.id, kind, refId);
      return NextResponse.json({ ok: true, cleared: true });
    }
    await db.saveDraft({
      user_id: user.id,
      kind,
      ref_id: refId,
      title,
      content,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, savedAt: Date.now() });
  } catch (err) {
    return serverError("drafts.save", err);
  }
}

/** DELETE /api/drafts?kind=new|edit&ref_id=帖子id —— 删除我的云端草稿 */
export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const p = request.nextUrl.searchParams;
  const kind = parseKind(p.get("kind"));
  const refId = (p.get("ref_id") ?? "").slice(0, 64);
  const db = await getDb();
  await db.deleteDraft(user.id, kind, refId);
  return NextResponse.json({ ok: true });
}
