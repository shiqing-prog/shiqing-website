import { NextResponse, type NextRequest } from "next/server";
import { asString, readJsonBody, serverError } from "@/lib/http";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

async function requireAdmin(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return { user: null, res: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  if (user.role !== "admin") {
    return { user: null, res: NextResponse.json({ error: "需要管理员权限" }, { status: 403 }) };
  }
  return { user, res: null };
}

/** GET /api/admin/reports?status=0 —— 举报列表（省略 status = 全部） */
export async function GET(request: NextRequest) {
  const { res } = await requireAdmin(request);
  if (res) return res;

  try {
    const statusRaw = new URL(request.url).searchParams.get("status");
    const status =
      statusRaw === null || statusRaw === ""
        ? undefined
        : Math.max(0, Math.min(2, Number(statusRaw) || 0));
    const db = await getDb();
    const [reports, pending] = await Promise.all([
      db.listReports({ status, limit: 100 }),
      db.countPendingReports(),
    ]);
    return NextResponse.json({ reports, pending });
  } catch (err) {
    return serverError("admin.reports.list", err);
  }
}

/**
 * PATCH /api/admin/reports —— 处理一条举报
 * body: { id, action: "delete" | "reject", note? }
 *
 * delete：删掉被举报的内容（帖子连同回复由调用方保证）后标记 status=1
 * reject：只驳回归档，不动内容，标记 status=2
 */
export async function PATCH(request: NextRequest) {
  const { user, res } = await requireAdmin(request);
  if (res || !user) return res;

  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });

  const id = asString(body.id, 64);
  const action = asString(body.action, 16);
  const note = asString(body.note, 300);
  if (!id) return NextResponse.json({ error: "缺少举报 id" }, { status: 400 });
  if (action !== "delete" && action !== "reject") {
    return NextResponse.json({ error: "action 只能是 delete 或 reject" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const report = await db.getReport(id);
    if (!report) return NextResponse.json({ error: "举报不存在" }, { status: 404 });
    if (report.status !== 0) {
      return NextResponse.json({ error: "这条举报已经处理过了" }, { status: 409 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (action === "delete") {
      let authorId = "";
      let excerpt = "";
      if (report.target_type === "post") {
        const post = await db.getPost(report.target_id);
        if (post) {
          authorId = post.author_id;
          excerpt = post.title;
          await db.deletePost(post.id);
        }
      } else {
        const reply = await db.getReply(report.target_id);
        if (reply) {
          authorId = reply.author_id;
          excerpt = reply.content.slice(0, 40);
          await db.deleteReply(reply.id);
        }
      }
      if (authorId) {
        await db.createNotification({
          id: crypto.randomUUID(),
          user_id: authorId,
          actor_id: user.id,
          type: "system",
          post_id: report.target_type === "post" ? report.target_id : null,
          reply_id: null,
          content: report.target_type === "post"
            ? `你的帖子《${excerpt}》因违反社区规范被删除`
            : `你的一条回复《${excerpt}…》因违反社区规范被删除`,
          is_read: 0,
          created_at: new Date().toISOString(),
        });
      }
    }

    if (action === "delete") {
      // 内容已经没了：同一目标下其他待处理举报一并不用再挨个点（否则列表里永远挂着指向已删内容的卡片）
      await db.archiveReportsForTarget(report.target_type, report.target_id, user.id, note, now);
      return NextResponse.json({ ok: true });
    }
    const ok = await db.handleReport(id, 2, user.id, note, now);
    if (!ok) return NextResponse.json({ error: "这条举报已经处理过了" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("admin.reports.handle", err);
  }
}
