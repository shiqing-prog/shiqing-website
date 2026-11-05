import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/data";
import { DOCS } from "@/lib/docs";
import { TOOLS } from "@/lib/tools";
import { getProjects } from "@/lib/store";
import { safe } from "@/lib/safe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "全站搜索 - ShiQing 时倾",
  description: "一次搜索全站：帖子、文档、工具、项目与标签。",
  robots: { index: false },
};

const MAX_Q = 60;

/** 把命中的关键词包成 <mark>，用 React 片段返回而不是拼 HTML，避免 XSS */
function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text.slice(0, 120);
  const start = Math.max(0, idx - 40);
  const head = start > 0 ? "…" : "";
  const before = text.slice(start, idx);
  const hit = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length, idx + q.length + 80);
  return (
    <>
      {head}
      {before}
      <mark className="bg-yellow-200 text-inherit dark:bg-yellow-700">{hit}</mark>
      {after}
    </>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="section-title text-lg">
        {title} <span className="text-sm font-normal text-gray-400">({count})</span>
      </h2>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().slice(0, MAX_Q);
  const lower = q.toLowerCase();

  const db = await getDb();
  const [postRes, allTags] = q
    ? await Promise.all([
        safe(db.listPosts({ q, page: 1, pageSize: 20 }), { posts: [], total: 0 }, "搜索-帖子"),
        safe(db.listTags(200), [], "搜索-标签"),
      ])
    : [{ posts: [], total: 0 }, []];

  const posts = postRes.posts;
  const tags = allTags
    .filter((t) => t.tag.toLowerCase().includes(lower))
    .slice(0, 12);
  const docs = q
    ? DOCS.filter((d) =>
        `${d.title} ${d.summary} ${d.slug}`.toLowerCase().includes(lower)
      ).slice(0, 12)
    : [];
  const tools = q
    ? TOOLS.filter((t) =>
        `${t.name} ${t.summary} ${t.group}`.toLowerCase().includes(lower)
      ).slice(0, 12)
    : [];
  const projects = q
    ? (await safe(getProjects(), [], "搜索-项目"))
        .filter((p) =>
          `${p.title} ${p.description} ${p.tech.join(" ")}`
            .toLowerCase()
            .includes(lower)
        )
        .slice(0, 12)
    : [];

  const total = posts.length + tags.length + docs.length + tools.length + projects.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="section-title text-2xl">全站搜索</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        帖子、文档、工具、项目、标签一次搜完。按 / 可以随时打开这里的搜索框。
      </p>

      <form action="/search" method="get" className="mt-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="搜点什么…"
          className="w-full rounded-[2px] border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          className="rounded-[2px] bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
        >
          搜索
        </button>
      </form>

      {q && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          关键词「{q}」共找到 {total} 条结果
        </p>
      )}

      <Section title="帖子" count={posts.length}>
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/bbs/post/${p.id}`}
            className="kratos-card block p-3 transition hover:border-blue-400"
          >
            <p className="font-medium">{highlight(p.title, q)}</p>
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
              {highlight(p.content.replace(/[#*`>[]()]/g, " "), q)}
            </p>
          </Link>
        ))}
      </Section>

      <Section title="文档" count={docs.length}>
        {docs.map((d) => (
          <Link
            key={d.slug}
            href={`/docs/${d.slug}`}
            className="kratos-card block p-3 transition hover:border-blue-400"
          >
            <p className="font-medium">{highlight(d.title, q)}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {highlight(d.summary, q)}
            </p>
          </Link>
        ))}
      </Section>

      <Section title="工具" count={tools.length}>
        {tools.map((t) => (
          <Link
            key={t.name}
            href="/tools"
            className="kratos-card block p-3 transition hover:border-blue-400"
          >
            <p className="font-medium">{highlight(t.name, q)}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {highlight(t.summary, q)}
            </p>
          </Link>
        ))}
      </Section>

      <Section title="项目" count={projects.length}>
        {projects.map((p) => (
          <Link
            key={p.id}
            href="/projects"
            className="kratos-card block p-3 transition hover:border-blue-400"
          >
            <p className="font-medium">{highlight(p.title, q)}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {highlight(p.description, q)}
            </p>
          </Link>
        ))}
      </Section>

      <Section title="标签" count={tags.length}>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link
              key={t.tag}
              href={`/tags/${encodeURIComponent(t.tag)}`}
              className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
            >
              #{highlight(t.tag, q)} · {t.count}
            </Link>
          ))}
        </div>
      </Section>

      {q && total === 0 && (
        <div className="kratos-card mt-8 p-10 text-center text-gray-500">
          没找到相关内容，换个关键词试试
        </div>
      )}
    </div>
  );
}
