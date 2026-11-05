"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 稍后读按钮。
 *
 * 与「收藏」不同：收藏是"我喜欢，留着"，稍后读是"待会儿看"，
 * 在 /bookmarks 里带未读标记，读过就不再高亮。
 */
export default function BookmarkButton({
  postId,
  initialBookmarked,
  refreshOnToggle = false,
}: {
  postId: string;
  initialBookmarked: boolean;
  refreshOnToggle?: boolean;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(data.error || "操作失败");
      }
      setBookmarked(data.bookmarked);
      // 稍后读列表里点了要立刻消失/出现，需要服务端重新渲染
      if (refreshOnToggle) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={busy}
        title={bookmarked ? "移出稍后读" : "加入稍后读"}
        className={`rounded-[2px] border px-3 py-1.5 text-xs transition disabled:opacity-50 ${
          bookmarked
            ? "border-amber-600 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-400"
            : "border-gray-300 text-gray-600 hover:border-amber-600 hover:text-amber-700 dark:border-gray-700 dark:text-gray-300"
        }`}
      >
        {bookmarked ? "📌 已存" : "📌 稍后读"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
