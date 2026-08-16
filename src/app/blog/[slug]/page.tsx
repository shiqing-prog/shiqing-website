import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPosts } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "文章不存在" };
  return {
    title: post.title,
    description: post.excerpt,
  };
}

// 把正文按空行拆成段落，支持 "# 标题" 与 "## 标题" 简单语法
function renderContent(content: string) {
  return content.split(/\n{2,}/).map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={i} className="mt-5 mb-2 text-lg font-bold">
          {trimmed.slice(4)}
        </h3>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-6 mb-3 text-xl font-bold">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={i} className="mt-6 mb-3 text-2xl font-bold">
          {trimmed.slice(2)}
        </h2>
      );
    }
    if (/^\d+\.\s/.test(trimmed)) {
      return (
        <ol key={i} className="mb-4 list-decimal pl-6 leading-relaxed">
          {trimmed.split(/\n/).map((line, j) => {
            const item = line.replace(/^\d+\.\s/, "").trim();
            return <li key={j}>{item}</li>;
          })}
        </ol>
      );
    }
    return (
      <p key={i} className="mb-4 leading-relaxed">
        {trimmed.split(/\n/).map((line, j) => (
          <span key={j}>
            {line}
            {j < trimmed.split(/\n/).length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <Link
        href="/blog"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回博客列表
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{post.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <time>{post.date}</time>
        {post.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            #{t}
          </span>
        ))}
      </div>
      <div className="prose-content mt-8 border-t border-gray-200 pt-8 dark:border-gray-800">
        {renderContent(post.content)}
      </div>
    </article>
  );
}
