import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";
import BbsPostCard from "@/components/bbs/BbsPostCard";

export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const db = await getDb();
  let currentUserId: string | null = null;
  let currentNickname = "";
  try {
    const { cookies } = await import("next/headers");
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) {
      const session = await db.getSession(token);
      if (session) {
        const u = await db.getUserById(session.user_id);
        if (u) {
          currentUserId = u.id;
          currentNickname = u.nickname;
        }
      }
    }
  } catch {
    /* 忽略 */
  }
  if (!currentUserId) notFound();

  const [feed, boards] = await Promise.all([
    db.listFollowingPosts(currentUserId, { page: 1, pageSize: 20 }),
    db.listBoards(),
  ]);
  const boardName = (id: string) => boards.find((b) => b.id === id)?.name;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回首页
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        关注动态
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {currentNickname} 关注的人的最新帖子
      </p>

      {feed.posts.length === 0 ? (
        <div className="kratos-card mt-6 p-10 text-center text-gray-500">
          你还没有关注任何人，或关注的人还没有发帖，
          <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
            回首页发现更多内容
          </Link>
          。
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {feed.posts.map((p) => (
            <BbsPostCard key={p.id} post={p} boardName={boardName(p.board_id)} />
          ))}
        </div>
      )}
    </div>
  );
}
