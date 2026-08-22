"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/types";

export default function StickyButton({
  postId,
  initialSticky,
}: {
  postId: string;
  initialSticky: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [sticky, setSticky] = useState(initialSticky);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  if (!user || user.role !== "admin") return null;

  async function toggle() {
    setBusy(true);
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
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      {sticky ? "📌 取消置顶" : "📌 置顶"}
    </button>
  );
}
