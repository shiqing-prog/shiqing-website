"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BbsPost } from "@/lib/types";

export default function FavoritesPage() {
  const [posts, setPosts] = useState<BbsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch("/api/auth/me").then((r) => r.json());
        if (!cancelled) setLoggedIn(Boolean(me.user));
        if (!me.user) return;
        const res = await fetch("/api/favorites", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setPosts(data.posts ?? []);
      } catch {
        /* 忽略 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && loggedIn === false) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-2xl">🔒</p>
        <p className="mt-3 text-gray-500">
          <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            登录
          </Link>{" "}
          后查看收藏
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="border-l-4 border-blue-600 pl-3 text-2xl font-bold">⭐ 我的收藏</h1>
      {loading ? (
        <p className="mt-6 text-gray-500">加载中…</p>
      ) : posts.length === 0 ? (
        <div className="kratos-card mt-6 p-10 text-center text-gray-500">
          还没有收藏的帖子
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {posts.map((p) => (
            <li key={p.id} className="kratos-card p-4">
              <Link href={`/bbs/post/${p.id}`} className="block">
                <p className="font-medium hover:text-blue-600 dark:hover:text-blue-400">
                  {p.title}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {p.author_nickname} · 💬 {p.reply_count ?? 0} · 👁{" "}
                  {(p.view_count ?? 0).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
