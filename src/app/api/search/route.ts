import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getProjects } from "@/lib/store";
import { DOCS } from "@/lib/docs";
import { TOOLS } from "@/lib/tools";
import { serverError } from "@/lib/http";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

function hit(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

/**
 * GET /api/search?q=xxx —— 全站搜索
 *
 * 一次请求聚合帖子、文档、工具、项目、标签五类，前端只渲染分区。
 * 每类限 8 条，避免单点大词把响应撑爆；空关键词直接返回空结构。
 */
export async function GET(request: NextRequest) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (!q) {
    return NextResponse.json({ q, posts: [], docs: [], tools: [], projects: [], tags: [], total: 0 });
  }
  const needle = q.toLowerCase();

  // 搜索页与命令面板都打这个接口，给个宽松但存在的上限，防止被拿来刷库
  const rl = await checkRateLimit(`search:${clientIp(request)}`, 40, 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "搜索太频繁，请稍一下" }, { status: 429 });
  }

  try {
    const db = await getDb();
    const [postResult, projects, tags] = await Promise.all([
      db.listPosts({ q, page: 1, pageSize: 8 }),
      getProjects(),
      db.listTags(200),
    ]);

    const posts = postResult.posts.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.content.replace(/\s+/g, " ").slice(0, 90),
      author: p.author_nickname ?? "匿名",
      created_at: p.created_at,
      reply_count: p.reply_count ?? 0,
    }));

    const docs = DOCS.filter(
      (d) => hit(d.title, needle) || hit(d.summary, needle) || hit(d.slug, needle)
    )
      .slice(0, 8)
      .map((d) => ({ slug: d.slug, title: d.title, summary: d.summary, group: d.group }));

    const tools = TOOLS.filter(
      (t) => hit(t.name, needle) || hit(t.summary, needle) || hit(t.group, needle)
    )
      .slice(0, 8)
      .map((t) => ({ name: t.name, group: t.group, summary: t.summary }));

    const proj = projects
      .filter(
        (p) =>
          hit(p.title, needle) ||
          hit(p.description ?? "", needle) ||
          hit((p.tech ?? []).join(" "), needle)
      )
      .slice(0, 8)
      .map((p) => ({ id: p.id, title: p.title, description: p.description ?? "" }));

    const tagHits = tags.filter((t) => hit(t.tag, needle)).slice(0, 8).map((t) => t);

    const total = posts.length + docs.length + tools.length + proj.length + tagHits.length;
    return NextResponse.json({ q, posts, docs, tools, projects: proj, tags: tagHits, total });
  } catch (err) {
    return serverError("search.all", err);
  }
}
