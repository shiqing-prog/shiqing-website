import { fmtDateTime } from "@/lib/time";
import Link from "next/link";
import type { BbsPost } from "@/lib/types";
import UserAvatar from "../UserAvatar";

export function fmtTime(iso: string): string {
  // 统一按中国时区显示（Worker 运行时为 UTC，直接用本地 getter 会差 8 小时）
  return fmtDateTime(iso);
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
    <article className="kratos-card group p-5 sm:p-6">
      {/* 元信息行：作者 / 时间 / 板块 */}
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Link
          href={`/user/${post.author_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
          title="查看用户主页"
        >
          <UserAvatar
            nickname={post.author_nickname ?? "匿名"}
            avatar={post.author_avatar}
            size={18}
          />
          {post.author_nickname ?? "匿名"}
        </Link>
        <span className="meta">{fmtTime(post.created_at)}</span>
        {boardName && <span className="meta">{boardName}</span>}
      </div>

      <Link href={`/bbs/post/${post.id}`}>
        <h2 className="post-card-title font-serif text-[19px] font-semibold leading-snug tracking-tight transition-colors sm:text-xl">
          {post.sticky ? (
            <span className="mr-2 inline-block border border-blue-600 px-1.5 py-[1px] align-[2px] text-[10px] font-medium tracking-widest text-blue-600 dark:border-blue-400 dark:text-blue-400">
              置顶
            </span>
          ) : null}
          {post.title}
        </h2>
      </Link>

      <p className="mt-2.5 text-[14px] leading-[1.75] text-gray-600 dark:text-gray-400">
        {excerpt}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/10 pt-3 dark:border-white/10">
        <span className="meta">
          回应{" "}
          <b className="font-mono text-gray-900 dark:text-gray-200">{post.reply_count ?? 0}</b>
        </span>
        <span className="meta">
          阅读{" "}
          <b className="font-mono text-gray-900 dark:text-gray-200">
            {(post.view_count ?? 0).toLocaleString()}
          </b>
        </span>
        <span className="meta">
          赞{" "}
          <b className="font-mono text-gray-900 dark:text-gray-200">
            {(post.likes ?? 0).toLocaleString()}
          </b>
        </span>
        {(post.tags ?? []).length > 0 && (
          <span className="ml-auto flex flex-wrap gap-1.5">
            {(post.tags ?? []).slice(0, 5).map((t) => (
              <Link
                key={t}
                href={`/bbs/search?tag=${encodeURIComponent(t)}`}
                className="text-xs text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              >
                #{t}
              </Link>
            ))}
          </span>
        )}
      </div>
    </article>
  );
}
