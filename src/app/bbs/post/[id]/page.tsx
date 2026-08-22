import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";
import ReplyBox from "@/components/bbs/ReplyBox";
import DeletePostButton from "@/components/bbs/DeletePostButton";
import DeleteReplyButton from "@/components/bbs/DeleteReplyButton";
import EditPostButton from "@/components/bbs/EditPostButton";
import EditReplyButton from "@/components/bbs/EditReplyButton";
import LikeButton from "@/components/bbs/LikeButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  return { title: post ? `${post.title} - 星夜` : "帖子不存在" };
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  if (!post) notFound();
  const board = await db.getBoard(post.board_id);
  const replies = await db.listReplies(id);

  // 阅读计数 +1（Kratos 风格 meta）
  await db.incrementPostViews(id);
  const views = (post.view_count ?? 0) + 1;

  // 当前登录用户是否已赞（服务端从 Cookie 会话判断）
  let liked = false;
  try {
    const { cookies } = await import("next/headers");
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) {
      const session = await db.getSession(token);
      if (session) liked = await db.isPostLiked(id, session.user_id);
    }
  } catch {
    /* 忽略 */
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={board ? `/bbs/board/${board.slug}` : "/"}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← {board ? board.name : "返回"}
      </Link>

      {/* 主帖（Kratos 文章卡） */}
      <article className="kratos-card mt-4 p-6 sm:p-8">
        <h1 className="text-2xl font-bold leading-snug sm:text-3xl">
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <Link
            href={`/user/${post.author_id}`}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            👤 {post.author_nickname ?? "匿名"}
          </Link>
          <span>🕐 {fmtTime(post.created_at)}</span>
          {board && <span>📂 {board.name}</span>}
          <span>💬 {replies.length} 回复</span>
          <span>👁 {views.toLocaleString()} 阅读</span>
          {post.updated_at > post.created_at && (
            <span title="最后编辑时间">✏️ 编辑于 {fmtTime(post.updated_at)}</span>
          )}
          <span className="ml-auto flex items-center gap-2">
            <LikeButton
              postId={post.id}
              initialLiked={liked}
              initialLikes={post.likes ?? 0}
            />
            <EditPostButton postId={post.id} authorId={post.author_id} />
            <DeletePostButton
              postId={post.id}
              authorId={post.author_id}
              boardSlug={board?.slug}
            />
          </span>
        </div>
        <div className="mt-6 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-6 dark:border-gray-800">
          {post.content}
        </div>
      </article>

      {/* 回复列表（评论区） */}
      <div className="mt-8">
        <h2 className="border-l-4 border-blue-600 pl-3 text-base font-bold">
          全部回复（{replies.length}）
        </h2>
        {replies.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">还没有回复，来抢沙发 🛋️</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {replies.map((r, i) => (
              <li key={r.id} className="kratos-card p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/user/${r.author_id}`}
                    className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {r.author_nickname}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-gray-400">
                    <EditReplyButton
                      replyId={r.id}
                      authorId={r.author_id}
                      initialContent={r.content}
                    />
                    <DeleteReplyButton replyId={r.id} authorId={r.author_id} />
                    <span>
                      #{i + 1} · {fmtTime(r.created_at)}
                    </span>
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {r.content}
                </p>
              </li>
            ))}
          </ul>
        )}
        <ReplyBox postId={post.id} />
      </div>
    </div>
  );
}
