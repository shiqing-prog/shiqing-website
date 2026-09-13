import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import UserAvatar from "@/components/UserAvatar";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const user = await db.getUserById(id);
  return { title: user ? `${user.nickname} 的粉丝 - 用户` : "用户不存在" };
}

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const user = await db.getUserById(id);
  if (!user) notFound();
  const list = await db.listFollowers(id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/user/${id}`}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← {user.nickname} 的主页
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        粉丝（{list.length}）
      </h1>

      {list.length === 0 ? (
        <div className="kratos-card mt-6 p-10 text-center text-gray-500">
          还没有粉丝
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {list.map((u) => (
            <li key={u.id} className="kratos-card flex items-center gap-3 p-4">
              <UserAvatar nickname={u.nickname} avatar={u.avatar} size={44} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/user/${u.id}`}
                  className="font-medium hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {u.nickname}
                </Link>
                {u.bio && (
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    {u.bio}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
