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
  return { title: post ? `${post.title} - 论坛` : "帖子不存在" };
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={board ? `/bbs/board/${board.slug}` : "/"}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← {board ? board.name : "返回"}
      </Link>

      {/* 主帖 */}
      <article className="mt-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">{post.title}</h1>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {post.author_nickname} 发布于 {fmtTime(post.created_at)} · 💬{" "}
          {replies.length} 回复
        </p>
        <div className="mt-5 whitespace-pre-wrap leading-relaxed">
          {post.content}
        </div>
      </article>

      {/* 回复列表 */}
      <div className="mt-8">
        <h2 className="font-bold">全部回复（{replies.length}）</h2>
        {replies.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">还没有回复</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {replies.map((r, i) => (
              <li
                key={r.id}
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{r.author_nickname}</span>
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
