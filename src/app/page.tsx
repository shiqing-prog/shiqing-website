import Link from "next/link";
import { getDb } from "@/lib/data";
import BbsPostCard from "@/components/bbs/BbsPostCard";
import SearchBox from "@/components/bbs/SearchBox";
import HitokotoQuote from "@/components/HitokotoQuote";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const sort = tab === "hot" ? "hot" : undefined;

  const db = await getDb();
  const [boards, recent, hot] = await Promise.all([
    db.listBoards(),
    db.listPosts({ page: 1, pageSize: 10, sort }),
    db.listPosts({ page: 1, pageSize: 5, sort: "hot" }),
  ]);

  const boardName = (id: string) => boards.find((b) => b.id === id)?.name;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 站点头部（毛玻璃 + 渐变标题） */}
      <header className="kratos-card mb-6 p-6 text-center sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-grad">{"<ShiQing 时倾 />"}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          一个无人知晓的小站点 —— 技术笔记、生活杂谈、资源共享
        </p>
        <HitokotoQuote />
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link href="/bbs/new" className="btn-grad px-5 py-2.5 text-sm">
            ✏️ 发布
          </Link>
          <Link
            href="/files"
            className="rounded-lg border border-gray-300 bg-white/60 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            📁 文件库
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-gray-300 bg-white/60 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            📝 注册
          </Link>
        </div>
      </header>

      {/* 双栏布局：左主栏 + 右固定侧栏（移动端单栏） */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ========== 左：主内容 ========== */}
        <div className="min-w-0">
          {/* 板块标签（移动端横向滚动） */}
          <nav className="no-scrollbar -mx-4 mb-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            <span className="shrink-0 text-xs text-gray-400">板块：</span>
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/bbs/board/${b.slug}`}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition hover:border-blue-600 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                {b.name}
                <span className="ml-1 text-xs text-gray-400">{b.post_count ?? 0}</span>
              </Link>
            ))}
          </nav>

          {/* 搜索框 */}
          <div className="mb-6 flex justify-end">
            <SearchBox compact />
          </div>

          {/* 最新/热门帖子 */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="border-l-4 border-blue-600 pl-3 text-base font-bold">
                {sort === "hot" ? "热门帖子" : "最新发布"}
              </h2>
              <div className="ml-auto flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
                <Link
                  href="/"
                  className={`rounded-md px-3 py-1 text-xs transition ${
                    sort !== "hot"
                      ? "bg-white font-medium shadow dark:bg-gray-900"
                      : "text-gray-500"
                  }`}
                >
                  最新
                </Link>
                <Link
                  href="/?tab=hot"
                  className={`rounded-md px-3 py-1 text-xs transition ${
                    sort === "hot"
                      ? "bg-white font-medium shadow dark:bg-gray-900"
                      : "text-gray-500"
                  }`}
                >
                  热门 🔥
                </Link>
              </div>
            </div>
            {recent.posts.length === 0 ? (
              <div className="kratos-card p-8 text-center text-gray-500">
                还没有帖子，
                <Link
                  href="/bbs/new"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  来发布第一篇
                </Link>
                。
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {recent.posts.map((p) => (
                  <BbsPostCard
                    key={p.id}
                    post={p}
                    boardName={boardName(p.board_id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ========== 右：侧栏（仅桌面 lg+ 显示，sticky） ========== */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {/* 板块导航 */}
            <div className="kratos-card p-5">
              <h3 className="mb-3 border-l-4 border-blue-600 pl-2.5 text-sm font-bold">
                板块导航
              </h3>
              <ul className="flex flex-col gap-1.5">
                {boards.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/bbs/board/${b.slug}`}
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <span>{b.name}</span>
                      <span className="text-xs text-gray-400">
                        {b.post_count ?? 0} 帖
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 热门帖子 TOP5 */}
            <div className="kratos-card p-5">
              <h3 className="mb-3 border-l-4 border-blue-600 pl-2.5 text-sm font-bold">
                🔥 热门帖子
              </h3>
              {hot.posts.length === 0 ? (
                <p className="text-xs text-gray-400">暂无数据</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {hot.posts.map((p, i) => (
                    <li key={p.id}>
                      <Link
                        href={`/bbs/post/${p.id}`}
                        className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <span className="mt-0.5 w-4 shrink-0 text-center text-xs font-bold text-blue-600 dark:text-blue-400">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{p.title}</span>
                        <span className="shrink-0 text-xs text-gray-400">
                          👍{p.likes ?? 0}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 关于本站 */}
            <div className="kratos-card p-5">
              <h3 className="mb-2.5 border-l-4 border-blue-600 pl-2.5 text-sm font-bold">
                关于本站
              </h3>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                论坛 · 文件库 · 游戏 · 工具，一个自托管的小社区。项目、更新日志与更多内容在站内探索。
              </p>
              <div className="mt-3 flex gap-2 text-xs">
                <Link
                  href="/about"
                  className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                >
                  关于
                </Link>
                <Link
                  href="/changelog"
                  className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                >
                  更新日志
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 其他内容入口（弱化） */}
      <footer className="mt-10 border-t border-gray-200 pt-4 text-center text-xs text-gray-400 dark:border-gray-700">
        个人主页 ·
        <Link href="/projects" className="mx-1 hover:underline">项目</Link>·
        <Link href="/changelog" className="mx-1 hover:underline">更新日志</Link>·
        <Link href="/tools" className="mx-1 hover:underline">工具</Link>·
        <Link href="/about" className="mx-1 hover:underline">关于</Link>
      </footer>
    </div>
  );
}
