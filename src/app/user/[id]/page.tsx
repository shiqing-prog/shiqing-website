import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import BbsPostCard from "@/components/bbs/BbsPostCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const user = await db.getUserById(id);
  return { title: user ? `${user.nickname} - 用户` : "用户不存在" };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const user = await db.getUserById(id);
  if (!user) notFound();

  const { posts, total } = await db.listPosts({
    authorId: id,
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回首页
      </Link>

      {/* 用户信息卡 */}
      <div className="kratos-card mt-4 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {user.nickname.slice(0, 1)}
          </span>
          <div>
            <h1 className="text-xl font-bold">
              {user.nickname}
              {user.role === "admin" && (
                <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                  ★ 管理员
                </span>
              )}
            </h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              注册于 {fmtDate(user.created_at)} · 共 {total} 帖
            </p>
          </div>
        </div>
        {user.bio && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{user.bio}</p>
        )}
      </div>

      {/* TA 的帖子 */}
      <h2 className="mt-8 mb-4 border-l-4 border-blue-600 pl-3 text-base font-bold">
        TA 的帖子（{total}）
      </h2>
      {posts.length === 0 ? (
        <div className="kratos-card p-8 text-center text-gray-500">
          还没有发过帖子
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
