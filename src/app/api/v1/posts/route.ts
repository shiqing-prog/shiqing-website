import { apiError, apiJson, authenticate, enforceQuota, pagination, preflight } from "@/lib/api";
import { getDb } from "@/lib/data";
import { parsePage, parsePageSize } from "@/lib/pagination";

export function OPTIONS() {
  return preflight();
}

/** 列表只要摘要：正文压缩空白后截断，避免一次拉回整页全文 */
function excerpt(text: string, max = 240): string {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/**
 * GET /api/v1/posts
 * 参数：page（默认 1）、pageSize（默认 20，上限 50）、board（板块 slug）、
 *       q（标题/正文关键词）、tag（标签）、sort=latest|hot
 */
export async function GET(request: Request) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const quota = await enforceQuota(result.auth);
  if (quota) return quota;

  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"));
  const pageSize = parsePageSize(url.searchParams.get("pageSize"), 20, 50);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const tag = (url.searchParams.get("tag") ?? "").trim().slice(0, 40);
  const boardSlug = (url.searchParams.get("board") ?? "").trim().slice(0, 40);
  const sort = url.searchParams.get("sort") === "hot" ? "hot" : "latest";

  const db = await getDb();
  let boardId: string | undefined;
  if (boardSlug) {
    const board = await db.getBoardBySlug(boardSlug);
    if (!board) return apiError(404, "board_not_found", `板块不存在：${boardSlug}`);
    boardId = board.id;
  }

  const { posts, total } = await db.listPosts({
    boardId,
    q: q || undefined,
    tag: tag || undefined,
    sort,
    page,
    pageSize,
  });

  return apiJson({
    data: posts.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: excerpt(p.content ?? ""),
      board: { id: p.board_id, name: p.board_name ?? "" },
      author: { id: p.author_id, nickname: p.author_nickname ?? "" },
      tags: p.tags ?? [],
      sticky: Number(p.sticky ?? 0) === 1,
      reply_count: p.reply_count ?? 0,
      view_count: p.view_count ?? 0,
      likes: p.likes ?? 0,
      created_at: p.created_at,
      updated_at: p.updated_at,
    })),
    pagination: pagination(page, pageSize, total),
  });
}
