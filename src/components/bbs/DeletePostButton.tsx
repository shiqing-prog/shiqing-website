"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/types";

export default function DeletePostButton({
  postId,
  authorId,
  boardSlug,
}: {
  postId: string;
  authorId: string;
  boardSlug?: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const canDelete = user && (user.id === authorId || user.role === "admin");
  if (!canDelete) return null;

  async function handleDelete() {
    if (!confirm("确定删除这个帖子？所有回复会一并删除，不可恢复。")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      router.push(boardSlug ? `/bbs/board/${boardSlug}` : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        {deleting ? "删除中…" : "🗑 删除帖子"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
