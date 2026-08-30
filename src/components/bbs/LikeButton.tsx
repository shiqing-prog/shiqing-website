"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LikeButton({
  postId,
  initialLiked,
  initialLikes,
}: {
  postId: string;
  initialLiked: boolean;
  initialLikes: number;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(data.error || "操作失败");
      }
      setLiked(data.liked);
      setLikes(data.likes);
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
          liked
            ? "border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-400"
            : "border-gray-300 text-gray-600 hover:border-blue-600 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
        }`}
      >
        👍 {likes > 0 ? likes.toLocaleString() : "点赞"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
