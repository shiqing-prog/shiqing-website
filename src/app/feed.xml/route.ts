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

/** /feed.xml —— 站内最新动态 RSS（最新帖子 + 近期更新日志） */
export async function GET() {
  const db = await getDb();
  const [posts, changelog] = await Promise.all([
    db.listPosts({ page: 1, pageSize: 10 }),
    Promise.resolve(getChangelog().slice(0, 5)),
  ]);

  const rfc822 = (iso: string) =>
    new Date(iso).toUTCString().replace("GMT", "+0000");

  const items: string[] = posts.posts.map((p) => {
    const url = `${SITE}/bbs/post/${p.id}`;
    const desc = esc(p.content.replace(/[#*`>]/g, "").slice(0, 200));
    return `<item>
  <title>${esc(p.title)}</title>
  <link>${url}</link>
  <guid>${url}</guid>
  <pubDate>${rfc822(p.created_at)}</pubDate>
  <description>${desc}${p.content.length > 200 ? "…" : ""}</description>
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

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>ShiQing 时倾</title>
  <link>${SITE}</link>
  <description>一个无人知晓的小站点 —— 论坛、文件库、游戏与工具</description>
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
}
