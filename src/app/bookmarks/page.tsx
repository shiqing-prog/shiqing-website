import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/data";
import { getSessionUserFromCookies } from "@/lib/auth";
import { safe } from "@/lib/safe";
import { fmtDateTime } from "@/lib/time";
import BookmarkButton from "@/components/bbs/BookmarkButton";
import BbsPostCard from "@/components/bbs/BbsPostCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "稍后读 - ShiQing 时倾",
  description: "存在这里待会儿看的帖子，读过的会标上已读。",
  robots: { index: false },
};

export default async function BookmarksPage() {
  const me = await getSessionUserFromCookies();

  if (!me) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-2xl">📌</p>
        <h1 className="mt-3 text-xl font-bold">稍后读</h1>
        <p className="mt-2 text-sm text-gray-500">登录后就能把想看的帖子先存起来。</p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-[2px] bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          去登录
        </Link>
      </div>
    );
  }

  const db = await getDb();
  const list = await safe(db.listBookmarks(me.id), [], "稍后读-列表");
  const unread = list.filter((p) => !p.bookmark_read_at).length;
  const boards = await safe(db.listBoards(), [], "稍后读-板块");
  const boardName = (id: string) => boards.find((b) => b.id === id)?.name;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="section-title text-2xl">稍后读</h1>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          未读 {unread} / 共 {list.length}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        点开帖子即视为读过。收藏在
        <Link href="/favorites" className="mx-1 text-blue-600 hover:underline dark:text-blue-400">
          /favorites
        </Link>
        ，和这里不冲突。
      </p>

      {list.length === 0 ? (
        <div className="kratos-card mt-6 p-10 text-center text-gray-500">
          还没有存任何帖子。在帖子右上角点「📌 稍后读」。
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {list.map((p) => (
            <div key={p.id} className="relative">
              {!p.bookmark_read_at && (
                <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">
                  未读
                </span>
              )}
              <BbsPostCard post={p} boardName={boardName(p.board_id)} />
              <div className="mt-1 flex items-center justify-end gap-3 text-xs text-gray-400">
                <span>存在 {fmtDateTime(p.bookmarked_at)}</span>
                <BookmarkButton postId={p.id} initialBookmarked refreshOnToggle />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
