import { apiJson, authenticate, enforceQuota, preflight } from "@/lib/api";
import { getDb } from "@/lib/data";
import { DOCS } from "@/lib/docs";
import { TOOLS } from "@/lib/tools";

export function OPTIONS() {
  return preflight();
}

/**
 * GET /api/v1/search?q=xxx —— 对外全站搜索
 *
 * 只暴露公开内容（帖子、文档、工具），不含项目私密字段与用户数据。
 */
export async function GET(request: Request) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const quota = await enforceQuota(result.auth);
  if (quota) return quota;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (!q) {
    return apiJson({ data: { q, posts: [], docs: [], tools: [] } });
  }
  const needle = q.toLowerCase();

  const db = await getDb();
  const { posts } = await db.listPosts({ q, page: 1, pageSize: 10 });

  return apiJson({
    data: {
      q,
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: p.content.replace(/\s+/g, " ").slice(0, 120),
        author: p.author_nickname ?? "匿名",
        created_at: p.created_at,
      })),
      docs: DOCS.filter(
        (d) =>
          d.title.toLowerCase().includes(needle) ||
          d.summary.toLowerCase().includes(needle) ||
          d.slug.includes(needle)
      )
        .slice(0, 10)
        .map((d) => ({ slug: d.slug, title: d.title, summary: d.summary })),
      tools: TOOLS.filter(
        (t) =>
          t.name.toLowerCase().includes(needle) ||
          t.summary.toLowerCase().includes(needle)
      )
        .slice(0, 10)
        .map((t) => ({ name: t.name, summary: t.summary })),
    },
  });
}
