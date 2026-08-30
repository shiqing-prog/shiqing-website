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
  const [boards, recent] = await Promise.all([
    db.listBoards(),
    db.listPosts({ page: 1, pageSize: 10, sort }),
  ]);

  const boardName = (id: string) => boards.find((b) => b.id === id)?.name;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 站点头部（新视觉：毛玻璃 + 渐变标题） */}
      <header className="kratos-card mb-8 p-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-fuchsia-400">
            {"<ShiQing 时倾 />"}
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          一个无人知晓的小站点 —— 技术笔记、生活杂谈、资源共享
        </p>
        <HitokotoQuote />
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/bbs/new"
            className="btn-grad px-5 py-2.5 text-sm shadow-md shadow-indigo-500/20"
          >
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

      {/* 板块标签（Kratos 分类导航） */}
      <nav className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400">板块：</span>
        {boards.map((b) => (
          <Link
            key={b.id}
            href={`/bbs/board/${b.slug}`}
            className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition hover:border-blue-600 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
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

      {/* 最新/热门帖子（Kratos 卡片流） */}
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
              <BbsPostCard key={p.id} post={p} boardName={boardName(p.board_id)} />
            ))}
          </div>
        )}
      </section>

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
