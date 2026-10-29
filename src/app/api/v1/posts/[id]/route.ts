import { apiError, apiJson, authenticate, enforceQuota, pagination, preflight } from "@/lib/api";
import { getDb } from "@/lib/data";
import { parsePage, parsePageSize } from "@/lib/pagination";

export function OPTIONS() {
  return preflight();
}

/**
 * GET /api/v1/posts/{id}
 * 可选：?replies=1 附带回复（replyPage / replyPageSize，默认 1 / 50，上限 100）
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const quota = await enforceQuota(result.auth);
  if (quota) return quota;

  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  if (!post) return apiError(404, "post_not_found", "帖子不存在");

  let replies: unknown[] | undefined;
  let replyPagination: ReturnType<typeof pagination> | undefined;
  if (new URL(request.url).searchParams.get("replies") === "1") {
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("replyPage"));
    const pageSize = parsePageSize(url.searchParams.get("replyPageSize"), 50, 100);
    const res = await db.listRepliesPage(id, page, pageSize);
    replies = res.replies.map((r) => ({
      id: r.id,
      author: { id: r.author_id, nickname: r.author_nickname ?? "" },
      content: r.content,
      parent_id: r.parent_id ?? null,
      reply_to: r.reply_to_nickname ?? null,
      likes: r.likes ?? 0,
      created_at: r.created_at,
    }));
    replyPagination = pagination(page, pageSize, res.total);
  }

  return apiJson({
    data: {
      id: post.id,
      title: post.title,
      content: post.content,
      board: { id: post.board_id, name: post.board_name ?? "" },
      author: { id: post.author_id, nickname: post.author_nickname ?? "" },
      tags: post.tags ?? [],
      attachments: post.attachments ?? [],
      sticky: Number(post.sticky ?? 0) === 1,
      reply_count: post.reply_count ?? 0,
      view_count: post.view_count ?? 0,
      likes: post.likes ?? 0,
      created_at: post.created_at,
      updated_at: post.updated_at,
      ...(replies ? { replies } : {}),
    },
    ...(replyPagination ? { replyPagination } : {}),
  });
}
