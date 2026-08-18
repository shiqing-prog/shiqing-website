import Link from "next/link";
import { getDb } from "@/lib/data";

export const dynamic = "force-dynamic";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default async function HomePage() {
  const db = await getDb();
  const [boards, recent] = await Promise.all([
    db.listBoards(),
    db.listPosts({ page: 1, pageSize: 10 }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* 站点标题 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {"<ShiQing 论坛 />"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600 dark:text-gray-300">
          一个简单的社区：注册账号、发帖交流、分享文件。
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/bbs/new"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            ✏️ 发新帖
          </Link>
          <Link
            href="/files"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            📁 文件库
          </Link>
        </div>
      </div>

      {/* 板块 */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">板块</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/bbs/board/${b.slug}`}
              className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-600"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{b.name}</h3>
                <span className="text-xs text-gray-500">
                  {b.post_count ?? 0} 帖
                </span>
              </div>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                {b.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* 最新帖子 */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">最新帖子</h2>
        {recent.posts.length === 0 ? (
          <p className="mt-4 text-gray-500">
            还没有帖子，<Link href="/bbs/new" className="text-blue-600 hover:underline dark:text-blue-400">来发第一帖</Link> 吧！
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {recent.posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/bbs/post/${p.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {p.author_nickname} · {fmtTime(p.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    💬 {p.reply_count ?? 0}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 其他内容入口（弱化） */}
      <footer className="mt-12 border-t border-gray-100 pt-4 text-center text-xs text-gray-400 dark:border-gray-800">
        个人主页 ·
        <Link href="/projects" className="mx-1 hover:underline">项目</Link>·
        <Link href="/blog" className="mx-1 hover:underline">博客</Link>·
        <Link href="/tools" className="mx-1 hover:underline">工具</Link>·
        <Link href="/about" className="mx-1 hover:underline">关于</Link>
      </footer>
    </div>
  );
}
