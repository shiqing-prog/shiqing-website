import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, shanghaiDay } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";
import BbsPostCard from "@/components/bbs/BbsPostCard";
import EditProfileButton from "@/components/user/EditProfileButton";
import FollowButton from "@/components/user/FollowButton";
import SignInCard from "@/components/user/SignInCard";
import AvatarChanger from "@/components/user/AvatarChanger";
import UserAvatar from "@/components/UserAvatar";
import { levelOf } from "@/lib/level";
import { buildSigninGrid } from "@/lib/signinGrid";
import type { SigninGrid } from "@/lib/signinGrid";

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

  const [postsResult, followers, following, pointsData] = await Promise.all([
    db.listPosts({ authorId: id, page: 1, pageSize: 50 }),
    db.countFollowers(id),
    db.countFollowing(id),
    db.getUserPoints(id),
  ]);
  const { posts, total } = postsResult;
  const levelInfo = levelOf(pointsData.points);

  // 服务端读登录态：currentUserId / 是否本人 / 是否已关注（本人则查签到统计）
  let currentUserId: string | null = null;
  try {
    const { cookies } = await import("next/headers");
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) {
      const session = await db.getSession(token);
      if (session) currentUserId = session.user_id;
    }
  } catch {
    /* 忽略 */
  }
  const isSelf = currentUserId === id;
  let isFollowing = false;
  let signStats: { today: boolean; streak: number; total: number } | null = null;
  let signGrid: SigninGrid | null = null;
  const today = shanghaiDay(new Date());
  if (currentUserId) {
    if (isSelf) {
      signStats = await db.getSignStats(id);
      signGrid = buildSigninGrid(await db.listSigninDays(id, 120), today);
    } else {
      isFollowing = await db.isFollowing(currentUserId, id);
    }
  }

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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar nickname={user.nickname} avatar={user.avatar} size={56} />
            <div>
              <h1 className="text-xl font-bold">
                {user.nickname}
                <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                  Lv{levelInfo.level} · {levelInfo.title}
                </span>
                {user.role === "admin" && (
                  <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                    ★ 管理员
                  </span>
                )}
              </h1>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                注册于 {fmtDate(user.created_at)} · 共 {total} 帖
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                👥{" "}
                <Link
                  href={`/user/${user.id}/followers`}
                  className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                >
                  粉丝 <span className="font-semibold">{followers}</span>
                </Link>{" "}
                ·{" "}
                <Link
                  href={`/user/${user.id}/following`}
                  className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                >
                  关注 <span className="font-semibold">{following}</span>
                </Link>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isSelf ? (
              <>
                <EditProfileButton userId={user.id} />
                <AvatarChanger nickname={user.nickname} avatar={user.avatar} />
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <Link
                    href={`/messages?to=${user.id}`}
                    className="btn-grad px-4 py-2 text-sm"
                  >
                    💬 发私信
                  </Link>
                  <FollowButton userId={user.id} initialFollowing={isFollowing} />
                </div>
              </>
            )}
          </div>
        </div>
        {user.bio && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{user.bio}</p>
        )}
      </div>

      {/* 等级与积分 */}
      <div className="kratos-card mt-4 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">
            Lv{levelInfo.level} · {levelInfo.title}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {pointsData.points} 积分
            {levelInfo.remaining > 0
              ? ` · 距下一级 ${levelInfo.remaining}`
              : " · 已满级 🎉"}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          发帖 +5 · 回复 +2 · 签到 +3 · 收到点赞 +1 ｜ 发帖 {pointsData.posts} ·
          回复 {pointsData.replies} · 签到 {pointsData.signins} · 获赞{" "}
          {pointsData.likesReceived}
        </p>
      </div>

      {/* 本人：每日签到 */}
      {isSelf && signStats && (
        <div className="mt-4">
          <SignInCard initial={signStats} grid={signGrid ?? undefined} today={today} />
        </div>
      )}

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
