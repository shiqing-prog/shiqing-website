import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DOCS, getDoc, getDocNeighbors, getGroup } from "@/lib/docs";
import { renderMarkdown } from "@/lib/markdown";
import { withHeadingIds } from "@/lib/toc";
import { readingStats } from "@/lib/reading";

/** 只预渲染已知文档，其它 slug 直接 404 */
export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return { title: "文档未找到" };
  return {
    title: doc.title,
    description: doc.summary,
    alternates: { canonical: "https://shiqing.site/docs/" + doc.slug },
    openGraph: {
      title: doc.title,
      description: doc.summary,
      type: "article",
    },
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const group = getGroup(doc.slug);
  const { prev, next } = getDocNeighbors(doc.slug);
  const { html, toc } = withHeadingIds(renderMarkdown(doc.body));
  const stats = readingStats(doc.body);

  return (
    <article>
      <nav aria-label="面包屑" className="meta flex flex-wrap items-center gap-1.5">
        <Link href="/docs" className="transition hover:text-blue-600">
          文档
        </Link>
        {group && (
          <>
            <span aria-hidden="true">/</span>
            <span>{group.label}</span>
          </>
        )}
      </nav>

      <h1 className="mt-2 font-serif text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
        {doc.title}
      </h1>
      <p className="mt-2 text-[14px] leading-6 text-gray-600 dark:text-gray-400">
        {doc.summary}
      </p>
      <p className="meta mt-3">
        {doc.updated} · 约 {stats.minutes} 分钟 · {stats.chars} 字
      </p>

      {toc.length > 2 && (
        <details className="mt-6 border border-black/10 dark:border-white/10">
          <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-medium select-none">
            本页目录（{toc.length} 节）
          </summary>
          <ul className="border-t border-black/10 px-4 py-3 text-[13px] leading-6 dark:border-white/10">
            {toc.map((item) => (
              <li key={item.id} className={item.level >= 3 ? "pl-4" : ""}>
                <a
                  href={"#" + item.id}
                  className="text-gray-600 transition hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div
        className="prose-content mt-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <footer className="mt-12 border-t border-black/10 pt-5 dark:border-white/10">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            {prev && (
              <Link
                href={"/docs/" + prev.slug}
                className="group block py-2 text-sm"
              >
                <span className="meta">上一篇</span>
                <span className="mt-0.5 block text-gray-700 transition group-hover:text-blue-600 dark:text-gray-300 dark:group-hover:text-blue-400">
                  {prev.title}
                </span>
              </Link>
            )}
          </div>
          <div className="sm:text-right">
            {next && (
              <Link
                href={"/docs/" + next.slug}
                className="group block py-2 text-sm"
              >
                <span className="meta">下一篇</span>
                <span className="mt-0.5 block text-gray-700 transition group-hover:text-blue-600 dark:text-gray-300 dark:group-hover:text-blue-400">
                  {next.title}
                </span>
              </Link>
            )}
          </div>
        </div>
      </footer>
    </article>
  );
}