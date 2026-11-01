import type { Metadata } from "next";
import Link from "next/link";
import { DOC_GROUPS, DOCS } from "@/lib/docs";

export const metadata: Metadata = {
  title: "ShiQing 文档",
  description: "ShiQing 时倾的使用文档：全站功能说明与开发者 API 参考。",
  alternates: { canonical: "https://shiqing.site/docs" },
};

const QUICK = [
  { href: "/docs/getting-started", label: "第一次来" },
  { href: "/docs/api-quickstart", label: "三分钟接入 API" },
  { href: "/docs/api-endpoints", label: "全部端点" },
  { href: "/docs/faq", label: "常见问题" },
];

export default function DocsHomePage() {
  return (
    <div>
      <header className="border-b border-black/10 pb-8 dark:border-white/10">
        <p className="meta">文档 · {DOCS.length} 篇</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          ShiQing 文档
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-gray-600 dark:text-gray-400">
          这个站怎么用，以及怎么用程序读它的数据。左边是目录；想写脚本的话，直接从「开发者 API」那一组开始。
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          {QUICK.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="rounded-[2px] border border-black/15 px-3 py-1.5 transition hover:border-black/40 dark:border-white/15 dark:hover:border-white/40"
            >
              {q.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {DOC_GROUPS.map((g) => (
          <section key={g.id} className="kratos-card p-5">
            <p className="meta">{g.pages.length} 篇</p>
            <h2 className="mt-1 font-serif text-lg font-semibold tracking-tight">
              {g.label}
            </h2>
            <p className="mt-1.5 text-[13px] leading-6 text-gray-600 dark:text-gray-400">
              {g.description}
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {g.pages.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={"/docs/" + p.slug}
                    className="text-gray-700 transition hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-black/10 pt-4 text-[12px] text-gray-500 dark:border-white/10 dark:text-gray-500">
        内容随站点版本更新；最近一次同步于 2026-10-30。发现写错的地方，欢迎在站内私信或邮件指出。
      </p>
    </div>
  );
}