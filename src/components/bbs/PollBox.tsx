"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PollResult } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function PollBox({
  postId,
  initial,
}: {
  postId: string;
  initial: PollResult;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const [result, setResult] = useState<PollResult>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const voted = result.myChoice !== null;

  async function vote(choice: number) {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (data.result) setResult(data.result); // 已投过也同步最新结果
        throw new Error(data.error || "投票失败");
      }
      if (data.result) setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "投票失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
      <p className="mb-4 text-sm font-bold">📊 投票（{result.total} 票）</p>
      <div className="flex flex-col gap-2.5">
        {result.options.map((label, i) => {
          const count = result.votes[i] ?? 0;
          const pct = result.total > 0 ? Math.round((count / result.total) * 100) : 0;
          const mine = result.myChoice === i;
          return (
            <div key={i}>
              {voted ? (
                // 已投：展示进度条
                <div
                  className={`rounded-lg border px-3.5 py-2.5 text-sm ${
                    mine
                      ? "border-indigo-400 bg-white dark:border-indigo-500 dark:bg-gray-900"
                      : "border-gray-200 bg-white/70 dark:border-gray-700 dark:bg-gray-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      {label}
                      {mine && <span className="ml-1.5 text-xs text-indigo-600 dark:text-indigo-400">✓ 你投了</span>}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">
                      {count} 票 · {pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full transition-all ${
                        mine
                          ? "bg-gradient-to-r from-indigo-500 to-violet-500"
                          : "bg-indigo-300 dark:bg-indigo-700"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ) : (
                // 未投：可点击选项
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void vote(i)}
                  className="w-full rounded-lg border border-gray-200 bg-white/70 px-3.5 py-2.5 text-left text-sm transition hover:border-indigo-400 hover:bg-white disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-indigo-500"
                >
                  {label}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2.5 text-xs text-red-600">{error}</p>}
      {!voted && user && (
        <p className="mt-3 text-xs text-gray-400">点击选项投票，每用户一票，投后不可更改</p>
      )}
      {!user && (
        <p className="mt-3 text-xs text-gray-400">登录后可参与投票</p>
      )}
    </div>
  );
}
