import type { Metadata } from "next";
import Link from "next/link";
import { getChangelog, type ChangelogEntry } from "@/lib/content";

export const metadata: Metadata = {
  title: "更新日志",
  description: "本站的更新历史记录。",
};

const CATEGORIES: Record<
  NonNullable<ChangelogEntry["category"]>,
  { label: string; cls: string }
> = {
  new: { label: "🆕 新功能", cls: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  improve: { label: "✨ 改进", cls: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" },
  fix: { label: "🔧 修复", cls: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  security: { label: "🛡️ 安全", cls: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
  docs: { label: "📄 文档", cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const all = getChangelog();
  const entries = cat && cat !== "all" ? all.filter((e) => e.category === cat) : all;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="border-l-4 border-blue-600 pl-3 text-3xl font-bold">
        更新日志
      </h1>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        本站每一次更新都会在这里总结。目前共 {all.length} 个版本。
      </p>

      {/* 分类筛选 */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/changelog"
          className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
            !cat || cat === "all"
              ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
          }`}
        >
          全部
        </Link>
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <Link
            key={key}
            href={`/changelog?cat=${key}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              cat === key
                ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : "border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {/* 时间线 */}
      <div className="mt-8 flex flex-col gap-6">
        {entries.length === 0 && (
          <p className="text-gray-500">该分类下暂无记录。</p>
        )}
        {entries.map((e, i) => {
          const catInfo = e.category ? CATEGORIES[e.category] : null;
          return (
            <div key={e.version} className="relative flex gap-4">
              {/* 时间线节点 */}
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    i === 0 && !cat ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  v{e.version.split(".")[1]}
                </span>
                {i < entries.length - 1 && (
                  <span className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />
                )}
              </div>

              {/* 版本卡片 */}
              <div className="kratos-card mb-1 flex-1 p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    v{e.version}
                  </span>
                  <time className="text-xs text-gray-400">{fmtDate(e.date)}</time>
                  {catInfo && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${catInfo.cls}`}
                    >
                      {catInfo.label}
                    </span>
                  )}
                </div>
                <h2 className="mt-1 text-lg font-semibold">{e.title}</h2>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {e.items.map((item, j) => (
                    <li
                      key={j}
                      className="flex gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
