import { getDb } from "@/lib/data";
import { getChangelog } from "@/lib/content";

export const dynamic = "force-dynamic";

/** 转义 XML 特殊字符 */
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const SITE = "https://shiqing.site";

/**
 * /feed.xml —— 站内最新动态 RSS（最新帖子 + 近期更新日志）
 * 支持 /feed.xml?board=<slug> 只看某个板块
 */
export async function GET(req: Request) {
  const boardSlug = new URL(req.url).searchParams.get("board")?.trim() || "";

  try {
    const db = await getDb();

    const boards = await db.listBoards();
    const board = boardSlug ? (boards.find((b) => b.slug === boardSlug) ?? null) : null;

    // 板块被改名/删除后，旧链接不要静默退化成「全站 feed」——订阅者会拿到错内容
    if (boardSlug && !board) {
      return new Response("Feed not found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const [posts, changelog] = await Promise.all([
      db.listPosts({ page: 1, pageSize: 20, boardId: board?.id }),
      Promise.resolve(board ? [] : getChangelog().slice(0, 5)),
    ]);

    const rfc822 = (iso: string) =>
      new Date(iso).toUTCString().replace("GMT", "+0000");

    const items: string[] = posts.posts.map((p) => {
      const body = p.content ?? "";
      const url = `${SITE}/bbs/post/${p.id}`;
      const desc = esc(body.replace(/[#*\`>]/g, "").slice(0, 200));
      return `<item>
  <title>${esc(p.title)}</title>
  <link>${url}</link>
  <guid>${url}</guid>
  <pubDate>${rfc822(p.created_at)}</pubDate>
  <description>${desc}${body.length > 200 ? "…" : ""}</description>
</item>`;
    });

    const changelogItems: string[] = changelog.map((c) => {
      const url = `${SITE}/changelog`;
      return `<item>
  <title>[更新] ${esc(c.version)} ${esc(c.title)}</title>
  <link>${url}</link>
  <guid>${SITE}/changelog#${esc(c.version)}</guid>
  <pubDate>${rfc822(`${c.date}T00:00:00Z`)}</pubDate>
  <description>${esc(c.items.join("；"))}</description>
</item>`;
    });

    const title = board ? `ShiQing 时倾 · ${board.name}` : "ShiQing 时倾";
    const link = board
      ? `${SITE}/bbs/board/${encodeURIComponent(board.slug)}`
      : SITE;
    const desc = board
      ? `时倾论坛「${board.name}」板块的最新帖子`
      : "一个无人知晓的小站点 —— 论坛、文件库、游戏与工具";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(title)}</title>
  <link>${link}</link>
  <description>${esc(desc)}</description>
  <language>zh-cn</language>
  ${items.join("\n")}
  ${changelogItems.join("\n")}
</channel>
</rss>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (err) {
    // D1 抖动/超时时给出明确的 503，而不是让订阅器一直撞 500
    console.error("[feed.xml] 生成失败", err);
    return new Response("Feed temporarily unavailable", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "300",
      },
    });
  }
}
