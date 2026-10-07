import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/data";
import type { BbsPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "归档",
  description: "按时间浏览时倾论坛的全部帖子。",
};

/** 单次最多拉取 40 页 × 50 = 2000 帖，避免极端情况下无限循环 */
const MAX_PAGES = 40;

export default async function ArchivePage() {
  const db = await getDb();
  const boards = await db.listBoards();
  const boardName = (id: string) => boards.find((b) => b.id === id)?.name;

  const all: BbsPost[] = [];
  let page = 1;
  for (;;) {
    const r = await db.listPosts({ page, pageSize: 50 });
    all.push(...r.posts);
    if (all.length >= r.total || page >= MAX_PAGES) break;
    page += 1;
  }

  // 按 YYYY-MM 分组
  const groups = new Map<string, BbsPost[]>();
  for (const p of all) {
    const key = p.created_at.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  const months = [...groups.keys()].sort().reverse();
  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return `${y} 年 ${Number(m)} 月`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回首页
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        🗃️ 归档
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        共 {all.length} 篇帖子，按发布时间归档。
      </p>

      {months.length === 0 ? (
        <div className="kratos-card mt-6 p-10 text-center text-gray-500">
          还没有帖子
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {months.map((ym) => (
            <section key={ym} className="kratos-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                {fmtMonth(ym)}
                <span className="font-normal text-gray-400">
                  （{groups.get(ym)!.length} 帖）
                </span>
              </h2>
              <ul className="mt-3 flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                {groups.get(ym)!.map((p) => (
                  <li key={p.id} className="flex items-baseline gap-3 py-2 text-sm">
                    <time
                      dateTime={p.created_at}
                      className="w-10 shrink-0 text-xs tabular-nums text-gray-400"
                    >
                      {Number(p.created_at.slice(8, 10))} 日
                    </time>
                    <Link
                      href={`/bbs/post/${p.id}`}
                      className="min-w-0 flex-1 truncate hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {p.title}
                    </Link>
                    {boardName(p.board_id) && (
                      <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">
                        {boardName(p.board_id)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
