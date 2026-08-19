import type { Metadata } from "next";
import { getChangelog } from "@/lib/content";

export const metadata: Metadata = {
  title: "更新日志",
  description: "本站的更新历史记录。",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function ChangelogPage() {
  const entries = getChangelog();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="border-l-4 border-blue-600 pl-3 text-3xl font-bold">
        更新日志
      </h1>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        本站每一次更新都会在这里总结。目前共 {entries.length} 个版本。
      </p>

      {/* 时间线 */}
      <div className="mt-8 flex flex-col gap-6">
        {entries.map((e, i) => (
          <div key={e.version} className="relative flex gap-4">
            {/* 时间线节点 */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  i === 0 ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
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
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  v{e.version}
                </span>
                <time className="text-xs text-gray-400">{fmtDate(e.date)}</time>
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
        ))}
      </div>
    </div>
  );
}
