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
          {post.title}
        </h2>
      </Link>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {excerpt}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span title="作者">👤 {post.author_nickname ?? "匿名"}</span>
        <span title="发布时间">🕐 {fmtTime(post.created_at)}</span>
        {boardName && <span title="板块">📂 {boardName}</span>}
        <span title="回复">💬 {post.reply_count ?? 0}</span>
        <span title="阅读">👁 {(post.view_count ?? 0).toLocaleString()}</span>
      </div>
    </article>
  );
}
