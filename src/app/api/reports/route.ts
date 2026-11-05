import { NextResponse, type NextRequest } from "next/server";
import { asString, readJsonBody, serverError } from "@/lib/http";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { REPORT_REASONS, type ReportTargetType } from "@/lib/types";

const TARGET_TYPES: ReportTargetType[] = ["post", "reply"];

/**
 * POST /api/reports —— 举报帖子或回复
 * body: { targetType: "post" | "reply", targetId, reason, detail? }
 *
 * 同一用户对同一目标只留一条（重复提交更新理由），所以重重点是"最后写的算"。
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });

  const targetType = asString(body.targetType, 10) as ReportTargetType;
  const targetId = asString(body.targetId, 64);
  const reason = asString(body.reason, 20);
  const detail = asString(body.detail, 500);

  if (!TARGET_TYPES.includes(targetType)) {
    return NextResponse.json({ error: "举报对象类型不正确" }, { status: 400 });
  }
  if (!targetId) return NextResponse.json({ error: "缺少举报对象" }, { status: 400 });
  if (!Object.prototype.hasOwnProperty.call(REPORT_REASONS, reason)) {
    return NextResponse.json({ error: "举报理由不正确" }, { status: 400 });
  }

  const rl = await checkRateLimit(`report:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "举报太频繁了，稍后再试" },
      {
        status: 429,
        headers: { "retry-after": String(Math.ceil((rl.retryAfterMs ?? 60000) / 1000)) },
      }
    );
  }

  try {
    const db = await getDb();
    if (targetType === "post") {
      const post = await db.getPost(targetId);
      if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
      if (post.author_id === user.id) {
        return NextResponse.json({ error: "不能举报自己的帖子" }, { status: 400 });
      }
    } else {
      const reply = await db.getReply(targetId);
      if (!reply) return NextResponse.json({ error: "回复不存在" }, { status: 404 });
      if (reply.author_id === user.id) {
        return NextResponse.json({ error: "不能举报自己的回复" }, { status: 400 });
      }
    }

    await db.createReport({
      id: `rep_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      target_type: targetType,
      target_id: targetId,
      reporter_id: user.id,
      reason,
      detail,
      status: 0,
      handled_by: "",
      handled_at: 0,
      note: "",
      created_at: Math.floor(Date.now() / 1000),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("reports.create", err);
  }
}
