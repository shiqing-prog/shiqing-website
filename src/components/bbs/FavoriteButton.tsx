"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FavoriteButton({
  postId,
  initialFavorited,
}: {
  postId: string;
  initialFavorited: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}/favorite`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(data.error || "操作失败");
      }
      setFavorited(data.favorited);
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
        className={`rounded-lg border px-3 py-1.5 text-xs transition disabled:opacity-50 ${
          favorited
            ? "border-amber-500 bg-amber-50 text-amber-600 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-400"
            : "border-gray-300 text-gray-600 hover:border-amber-500 hover:text-amber-600 dark:border-gray-700 dark:text-gray-300"
        }`}
      >
        {favorited ? "⭐ 已收藏" : "☆ 收藏"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
