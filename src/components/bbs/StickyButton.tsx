"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function StickyButton({
  postId,
  initialSticky,
}: {
  postId: string;
  initialSticky: boolean;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [sticky, setSticky] = useState(initialSticky);
  const [error, setError] = useState("");

  if (!user || user.role !== "admin") return null;

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}/sticky`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sticky: !sticky }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      setSticky(data.sticky === 1);
      router.refresh();
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
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {sticky ? "📌 取消置顶" : "📌 置顶"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
