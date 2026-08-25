import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/data";
import BbsPostCard from "@/components/bbs/BbsPostCard";
import SearchBox from "@/components/bbs/SearchBox";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "搜索" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const query = (q ?? "").trim();
  const tagQuery = (tag ?? "").trim();
  const db = await getDb();
  const boards = await db.listBoards();
  const boardName = (id: string) => boards.find((b) => b.id === id)?.name;

  let results = { posts: [] as Awaited<ReturnType<typeof db.listPosts>>["posts"], total: 0 };
  if (query || tagQuery) {
    results = await db.listPosts({
      q: query || undefined,
      tag: tagQuery || undefined,
      page: 1,
      pageSize: 50,
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="border-l-4 border-blue-600 pl-3 text-2xl font-bold">搜索</h1>
      <div className="mt-5">
        <SearchBox initial={query} />
      </div>

      {(query || tagQuery) ? (
        <div className="mt-6">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {tagQuery ? (
              <>
                标签「<span className="text-blue-600">#{tagQuery}</span>」共找到 {results.total} 条结果
              </>
            ) : (
              <>关键词「{query}」共找到 {results.total} 条结果</>
            )}
          </p>
          {results.posts.length === 0 ? (
            <div className="kratos-card p-8 text-center text-gray-500">
              没有找到相关帖子，换个关键词试试？
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {results.posts.map((p) => (
                <BbsPostCard key={p.id} post={p} boardName={boardName(p.board_id)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="kratos-card mt-6 p-8 text-center text-gray-500">
          输入关键词搜索全站帖子
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        <Link href="/" className="hover:underline">← 返回首页</Link>
      </p>
    </div>
  );
}
