import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/data";
import UserAvatar from "@/components/UserAvatar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "排行榜",
  description: "时倾社区的活跃榜单：发帖、获赞与签到。",
};

interface Row {
  userId: string;
  nickname: string;
  avatar: string | null;
  value: number;
}

function RankList({
  icon,
  title,
  hint,
  unit,
  rows,
}: {
  icon: string;
  title: string;
  hint: string;
  unit: string;
  rows: Row[];
}) {
  return (
    <section className="kratos-card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <h2 className="text-sm font-bold">
          {icon} {title}
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">暂无数据</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r, i) => (
            <li key={r.userId} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span
                className={`w-6 shrink-0 text-center font-bold ${
                  i === 0
                    ? "text-yellow-500"
                    : i === 1
                      ? "text-gray-400"
                      : i === 2
                        ? "text-orange-600"
                        : "text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <UserAvatar nickname={r.nickname} avatar={r.avatar} size={22} />
              <Link
                href={`/user/${r.userId}`}
                className="min-w-0 flex-1 truncate hover:text-blue-600 dark:hover:text-blue-400"
              >
                {r.nickname}
              </Link>
              <span className="shrink-0 text-xs text-gray-400">
                {r.value.toLocaleString()} {unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function LeaderboardPage() {
  const db = await getDb();
  const [byPosts, byLikes, signTop] = await Promise.all([
    db.postLeaderboard("posts", 10),
    db.postLeaderboard("likes", 10),
    db.signinLeaderboard(10),
  ]);
  const bySignin: Row[] = signTop.map((s) => ({
    userId: s.userId,
    nickname: s.nickname,
    avatar: s.avatar,
    value: s.total,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/stats"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 站点统计
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        🏆 排行榜
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        谁在认真发帖、谁最受欢迎、谁天天签到。
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-1">
        <RankList
          icon="📝"
          title="发帖达人"
          hint="按累计发帖数排名"
          unit="帖"
          rows={byPosts}
        />
        <RankList
          icon="👍"
          title="人气作者"
          hint="按帖子累计获赞数排名"
          unit="赞"
          rows={byLikes}
        />
        <RankList
          icon="🔥"
          title="签到之星"
          hint="按累计签到天数排名"
          unit="天"
          rows={bySignin}
        />
      </div>
    </div>
  );
}
