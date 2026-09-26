"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BbsPost } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function FavoritesPage() {
  const [posts, setPosts] = useState<BbsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = useCurrentUser();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/favorites", { cache: "no-store" });
        if (!res.ok) {
          // 不要把 401/500 当成「没有收藏」，否则用户会以为收藏被清空了
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `加载失败（${res.status}）`);
        }
        const data = (await res.json()) as { posts?: BbsPost[] };
        if (!cancelled) {
          setPosts(data.posts ?? []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 未登录时 loading 会一直是 true（不会发起请求），因此这两个分支必须要求 user 存在
  if (loading && user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">
        加载中…
      </div>
    );
  }

  if (error && user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-2xl">⚠️</p>
        <p className="mt-3 text-gray-500">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError("");
            setLoading(true);
            void fetch("/api/favorites", { cache: "no-store" })
              .then(async (res) => {
                if (!res.ok) throw new Error(`加载失败（${res.status}）`);
                const data = (await res.json()) as { posts?: BbsPost[] };
                setPosts(data.posts ?? []);
              })
              .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : "加载失败")
              )
              .finally(() => setLoading(false));
          }}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  if (!user) {
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
