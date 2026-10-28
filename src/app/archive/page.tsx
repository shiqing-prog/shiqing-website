import type { Metadata } from "next";
import Link from "next/link";
import { getDb, shanghaiMonthKey } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import { fmtDate } from "@/lib/time";
import type { BbsPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "归档",
  description: "按时间浏览时倾论坛的全部帖子。",
};

/** 每页 50 帖。原来是「循环拉 40 页拼全量」，帖子过 2000 就静默截断，
 *  而且每次渲染要串行跑最多 40 条分页查询 + 把 2000 条帖子塞进 RSC 载荷。 */
const PAGE_SIZE = 50;

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = parsePage(pageStr);

  const db = await getDb();
  const [boards, result] = await Promise.all([
    db.listBoards(),
    db.listPosts({ page, pageSize: PAGE_SIZE }),
  ]);
  const { posts, total } = result;
  const boardName = (id: string) => boards.find((b) => b.id === id)?.name;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  // 按 YYYY-MM 分组（中国时区：UTC 切月会把月初 8 小时算进上个月）
  const groups = new Map<string, BbsPost[]>();
  for (const p of posts) {
    const key = shanghaiMonthKey(p.created_at) || "未知";
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  const months = [...groups.keys()].sort().reverse();
  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    if (!m) return ym;
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
        共 {total} 篇帖子，按发布时间归档
        {totalPages > 1 && `（第 ${page} / ${totalPages} 页）`}。
      </p>

      {posts.length === 0 ? (
        <div className="kratos-card mt-6 p-10 text-center text-gray-500">
          {page > 1 ? "这一页没有内容了" : "还没有帖子"}
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
                      {Number(fmtDate(p.created_at).slice(8, 10))} 日
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

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/archive?page=${page - 1}`}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition hover:border-blue-600 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  ← 上一页
                </Link>
              )}
              <span className="px-2 text-sm text-gray-500">
                第 {page} / {totalPages} 页
              </span>
              {page < totalPages && (
                <Link
                  href={`/archive?page=${page + 1}`}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition hover:border-blue-600 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  下一页 →
                </Link>
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
