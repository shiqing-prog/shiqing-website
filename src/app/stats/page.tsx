import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "站点统计",
  description: "时倾站点的内容与活跃度统计。",
};

export default async function StatsPage() {
  const db = await getDb();
  const [stats, boards, signTop] = await Promise.all([
    db.getSiteStats(),
    db.listBoards(),
    db.signinLeaderboard(10),
  ]);

  const cards = [
    { label: "注册用户", value: stats.users, icon: "👤" },
    { label: "帖子总数", value: stats.posts, icon: "📝" },
    { label: "回复总数", value: stats.replies, icon: "💬" },
    { label: "文件库文件", value: stats.files, icon: "📁" },
    { label: "私信条数", value: stats.messages, icon: "✉️" },
    { label: "签到人次", value: stats.signins, icon: "🔥" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 返回首页
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        📊 站点统计
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        一个无人知晓的小站点，也在慢慢积累内容。
      </p>

      {/* 数据卡片 */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="kratos-card p-5 text-center">
            <p className="text-2xl">{c.icon}</p>
            <p className="mt-1 text-2xl font-bold">{c.value.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* 板块分布 */}
      <h2 className="mt-8 mb-4 border-l-4 border-blue-600 pl-3 text-base font-bold">
        板块分布
      </h2>
      <div className="kratos-card p-5">
        <ul className="flex flex-col gap-2.5">
          {boards.map((b) => {
            const count = b.post_count ?? 0;
            const max = Math.max(...boards.map((x) => x.post_count ?? 0), 1);
            const pct = Math.round((count / max) * 100);
            return (
              <li key={b.id}>
                <div className="flex items-center justify-between text-sm">
                  <Link
                    href={`/bbs/board/${b.slug}`}
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {b.name}
                  </Link>
                  <span className="text-xs text-gray-400">{count} 帖</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 签到榜 */}
      <h2 className="mt-8 mb-4 border-l-4 border-blue-600 pl-3 text-base font-bold">
        🔥 签到排行榜
      </h2>
      {signTop.length === 0 ? (
        <div className="kratos-card p-8 text-center text-gray-500">还没有人签到</div>
      ) : (
        <div className="kratos-card overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {signTop.map((s, i) => (
              <li key={s.userId} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span
                  className={`w-6 shrink-0 text-center font-bold ${
                    i === 0
                      ? "text-yellow-500"
                      : i === 1
                        ? "text-gray-400"
                        : i === 2
                          ? "text-orange-600"
                          : "text-gray-400"
                  }`}
                >
                  {i + 1}
                </span>
                <Link
                  href={`/user/${s.userId}`}
                  className="min-w-0 flex-1 truncate hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {s.nickname}
                </Link>
                <span className="shrink-0 text-xs text-gray-400">{s.total} 天</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
