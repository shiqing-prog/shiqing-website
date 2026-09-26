import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "标签云",
  description: "时倾论坛的全部标签，按使用次数排列。",
};

export default async function TagsPage() {
  const db = await getDb();
  const tags = await db.listTags(80);
  const max = Math.max(...tags.map((t) => t.count), 1);

  /** 按热度分 3 档字号 */
  const sizeCls = (count: number) =>
    count >= max * 0.66
      ? "text-lg font-bold"
      : count >= max * 0.33
        ? "text-base font-medium"
        : "text-sm";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 返回首页
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        🏷️ 标签云
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        共 {tags.length} 个标签，字号越大表示帖子越多。点击查看该标签下的帖子。
      </p>

      {tags.length === 0 ? (
        <div className="kratos-card mt-6 p-10 text-center text-gray-500">
          还没有任何标签，发帖时加上标签吧
        </div>
      ) : (
        <div className="kratos-card mt-6 flex flex-wrap items-center gap-3 p-6">
          {tags.map((t) => (
            <Link
              key={t.tag}
              href={`/bbs/search?tag=${encodeURIComponent(t.tag)}`}
              className={`rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-blue-950 dark:hover:text-blue-300 ${sizeCls(
                t.count
              )}`}
            >
              #{t.tag}
              <span className="ml-1 text-xs text-gray-400">{t.count}</span>
            </Link>
          ))}
        </div>
      )}

      {/* 榜单形式：最热标签 Top 10 */}
      {tags.length > 0 && (
        <>
          <h2 className="mt-8 mb-4 border-l-4 border-blue-600 pl-3 text-base font-bold">
            最热标签 Top 10
          </h2>
          <div className="kratos-card overflow-hidden">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {tags.slice(0, 10).map((t, i) => (
                <li key={t.tag} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-6 shrink-0 text-center font-bold text-gray-400">
                    {i + 1}
                  </span>
                  <Link
                    href={`/bbs/search?tag=${encodeURIComponent(t.tag)}`}
                    className="min-w-0 flex-1 truncate hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    #{t.tag}
                  </Link>
                  <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-gray-200 sm:block dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${Math.round((t.count / max) * 100)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{t.count} 帖</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
