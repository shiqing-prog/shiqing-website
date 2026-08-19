import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import BbsPostCard from "@/components/bbs/BbsPostCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDb();
  const board = await db.getBoardBySlug(slug);
  return { title: board ? `${board.name} - 星夜` : "板块不存在" };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const board = await db.getBoardBySlug(slug);
  if (!board) notFound();

  const { posts, total } = await db.listPosts({ boardId: board.id, pageSize: 50 });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回首页
      </Link>

      {/* 板块头 */}
      <div className="mt-4 mb-6 flex items-center justify-between rounded-lg bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-gray-900">
        <div>
          <h1 className="border-l-4 border-blue-600 pl-3 text-xl font-bold">
            {board.name}
          </h1>
          <p className="mt-2 pl-3 text-sm text-gray-500 dark:text-gray-400">
            {board.description} · 共 {total} 帖
          </p>
        </div>
        <Link
          href={`/bbs/new?board=${board.id}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          ✏️ 发帖
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="kratos-card p-8 text-center text-gray-500">
          这个板块还没有帖子，来发第一帖吧！
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((p) => (
            <BbsPostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
