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
  searchParams: Promise<{ q?: string; tag?: string; board?: string; sort?: string }>;
}) {
  const { q, tag, board, sort } = await searchParams;
  const query = (q ?? "").trim();
  const tagQuery = (tag ?? "").trim();
  const boardFilter = (board ?? "").trim();
  const sortFilter = sort === "hot" ? "hot" : "";
  const db = await getDb();
  const boards = await db.listBoards();
  const boardName = (id: string) => boards.find((b) => b.id === id)?.name;

  let results = { posts: [] as Awaited<ReturnType<typeof db.listPosts>>["posts"], total: 0 };
  if (query || tagQuery) {
    results = await db.listPosts({
      q: query || undefined,
      tag: tagQuery || undefined,
      boardId: boardFilter || undefined,
      sort: sortFilter || undefined,
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
          {/* 筛选：板块 + 排序（GET 提交，保留关键词/标签） */}
          <form
            method="get"
            action="/bbs/search"
            className="mb-4 flex flex-wrap items-center gap-2 text-sm"
          >
            {query && <input type="hidden" name="q" value={query} />}
            {tagQuery && <input type="hidden" name="tag" value={tagQuery} />}
            <select
              name="board"
              defaultValue={boardFilter}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">全部板块</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              name="sort"
              defaultValue={sortFilter}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">最新</option>
              <option value="hot">最热</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              筛选
            </button>
          </form>
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
