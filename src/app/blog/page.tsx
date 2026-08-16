import type { Metadata } from "next";
import { getPosts } from "@/lib/content";
import { PostList } from "@/components/PostCard";

export const metadata: Metadata = {
  title: "博客",
  description: "我的技术笔记与生活随想。",
};

export default async function BlogPage() {
  const posts = await getPosts(true);

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-bold">博客</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300">
        共 {posts.length} 篇文章。
      </p>
      <div className="mt-8">
        {posts.length > 0 ? (
          <PostList posts={posts} />
        ) : (
          <p className="text-gray-500">还没有已发布的文章。</p>
        )}
      </div>
    </div>
  );
}
