"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 标签关注按钮：关注后该标签有新帖会在通知里出现 */
export default function TagFollowButton({
  tag,
  initialFollowing,
  loggedIn,
}: {
  tag: string;
  initialFollowing: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(tag)}/follow`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) setFollowing(data.following);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-[2px] border px-3 py-1 text-xs transition disabled:opacity-50 ${
        following
          ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300"
          : "border-gray-300 text-gray-600 hover:border-blue-600 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
      }`}
    >
      {following ? "✓ 已关注" : "+ 关注标签"}
    </button>
  );
}
