import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import BbsPostCard from "@/components/bbs/BbsPostCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const t = decodeURIComponent(tag);
  return {
    title: `#${t}`,
    description: `标签 #${t} 下的全部帖子 - ShiQing 时倾`,
  };
}

export default async function TagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tag } = await params;
  const { page: pageRaw } = await searchParams;
  const t = decodeURIComponent(tag).trim();
  if (!t) notFound();

  const page = Math.max(Number(pageRaw ?? 1) || 1, 1);
  const db = await getDb();
  const [boards, result] = await Promise.all([
    db.listBoards(),
    db.listPosts({ tag: t, page, pageSize: PAGE_SIZE }),
  ]);
  const boardName = (id: string) => boards.find((b) => b.id === id)?.name;
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/tags"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 标签云
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        #{t}
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        共 {result.total} 篇帖子
      </p>

      {result.posts.length === 0 ? (
        <div className="kratos-card mt-6 p-10 text-center text-gray-500">
          该标签下还没有帖子
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {result.posts.map((p) => (
            <BbsPostCard key={p.id} post={p} boardName={boardName(p.board_id)} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/tags/${encodeURIComponent(t)}?page=${page - 1}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              ← 上一页
            </Link>
          )}
          <span className="px-2 text-gray-500">
            第 {page} / {totalPages} 页
          </span>
          {page < totalPages && (
            <Link
              href={`/tags/${encodeURIComponent(t)}?page=${page + 1}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              下一页 →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
