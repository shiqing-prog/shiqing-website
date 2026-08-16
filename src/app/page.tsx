import Link from "next/link";
import { getProjects, getPosts } from "@/lib/store";
import { ProjectGrid } from "@/components/ProjectCard";
import { PostList } from "@/components/PostCard";

// 读取 JSON 数据，保持每次请求都取最新内容
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [projects, posts] = await Promise.all([
    getProjects(),
    getPosts(true),
  ]);
  const featured = projects.filter((p) => p.featured).slice(0, 2);
  const latestPosts = posts.slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      {/* Hero */}
      <section className="py-10 text-center">
        <p className="text-sm font-medium tracking-widest text-blue-600 dark:text-blue-400">
          HELLO, I&apos;M
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          你好，我是 <span className="text-blue-600 dark:text-blue-400">你的名字</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-300">
          一名热爱技术的前端开发者。这里是我的个人主页 —— 展示我做过的东西、
          记录我学到的东西。
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/projects"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            查看项目
          </Link>
          <Link
            href="/about"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            关于我
          </Link>
        </div>
      </section>

      {/* 精选项目 */}
      <section className="mt-16">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">精选项目</h2>
          <Link
            href="/projects"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            全部项目 →
          </Link>
        </div>
        {featured.length > 0 ? (
          <ProjectGrid projects={featured} />
        ) : (
          <p className="text-gray-500">暂无精选项目，去后台添加一个吧。</p>
        )}
      </section>

      {/* 最新文章 */}
      <section className="mt-16">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">最新文章</h2>
          <Link
            href="/blog"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            全部文章 →
          </Link>
        </div>
        {latestPosts.length > 0 ? (
          <PostList posts={latestPosts} />
        ) : (
          <p className="text-gray-500">还没有文章，去后台写一篇吧。</p>
        )}
      </section>
    </div>
  );
}
