import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDb();
  const board = await db.getBoardBySlug(slug);
  return { title: board ? `${board.name} - 论坛` : "板块不存在" };
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回首页
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{board.name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
        <p className="mt-8 text-gray-500">这个板块还没有帖子，来发第一帖吧！</p>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/bbs/post/${p.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {p.author_nickname} · {fmtTime(p.created_at)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  💬 {p.reply_count ?? 0}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
