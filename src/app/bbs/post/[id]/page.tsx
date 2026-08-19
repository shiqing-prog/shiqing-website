import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import ReplyBox from "@/components/bbs/ReplyBox";

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
          <span>👤 {post.author_nickname ?? "匿名"}</span>
          <span>🕐 {fmtTime(post.created_at)}</span>
          {board && <span>📂 {board.name}</span>}
          <span>💬 {replies.length} 回复</span>
          <span>👁 {views.toLocaleString()} 阅读</span>
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
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    {r.author_nickname}
                  </span>
                  <span className="text-xs text-gray-400">
                    #{i + 1} · {fmtTime(r.created_at)}
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
