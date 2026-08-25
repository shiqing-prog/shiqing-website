import Link from "next/link";
import type { BbsPost } from "@/lib/types";

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** Kratos 风格帖子卡片：标题 + 摘要 + meta（日期/分类/回复/阅读） */
export default function BbsPostCard({
  post,
  boardName,
}: {
  post: BbsPost;
  boardName?: string;
}) {
  const excerpt =
    post.content.length > 120 ? post.content.slice(0, 120) + "…" : post.content;

  return (
    <article className="kratos-card p-5">
      <Link href={`/bbs/post/${post.id}`}>
        <h2 className="text-lg font-bold leading-snug transition hover:text-blue-600 dark:hover:text-blue-400">
          {post.sticky ? (
            <span className="mr-1.5 rounded bg-blue-600 px-1.5 py-0.5 align-middle text-xs font-medium text-white">
              置顶
            </span>
          ) : null}
          {post.title}
        </h2>
      </Link>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {excerpt}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <Link
          href={`/user/${post.author_id}`}
          className="hover:text-blue-600 dark:hover:text-blue-400"
          title="查看用户主页"
        >
          👤 {post.author_nickname ?? "匿名"}
        </Link>
        <span title="发布时间">🕐 {fmtTime(post.created_at)}</span>
        {boardName && <span title="板块">📂 {boardName}</span>}
        <span title="回复">💬 {post.reply_count ?? 0}</span>
        <span title="阅读">👁 {(post.view_count ?? 0).toLocaleString()}</span>
        <span title="点赞">👍 {(post.likes ?? 0).toLocaleString()}</span>
      </div>
      {(post.tags ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(post.tags ?? []).slice(0, 5).map((t) => (
            <Link
              key={t}
              href={`/bbs/search?tag=${encodeURIComponent(t)}`}
              className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
