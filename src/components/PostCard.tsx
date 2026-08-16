import Link from "next/link";
import type { Post } from "@/lib/types";

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <Link href={`/blog/${post.slug}`}>
        <h3 className="text-lg font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {post.title}
        </h3>
      </Link>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {post.date}
        {post.tags.length > 0 && (
          <span className="ml-2">
            {post.tags.map((t) => `#${t}`).join(" ")}
          </span>
        )}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {post.excerpt}
      </p>
    </article>
  );
}

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <div className="flex flex-col gap-5">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
