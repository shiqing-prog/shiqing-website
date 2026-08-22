"use client";

import { useEffect, useState } from "react";

export default function LikeButton({
  postId,
  initialLiked,
  initialLikes,
}: {
  postId: string;
  initialLiked: boolean;
  initialLikes: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [busy, setBusy] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  // 挂载时检测登录状态
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setLoggedIn(Boolean(d.user)))
      .catch(() => setLoggedIn(false));
  }, []);

  async function toggle() {
    if (loggedIn === false) {
      window.location.href = "/login";
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(data.error || "操作失败");
      }
      setLiked(data.liked);
      setLikes(data.likes);
    } catch {
      /* 忽略 */
    } finally {
      setBusy(false);
    }
  }

  return (
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
  );
}
