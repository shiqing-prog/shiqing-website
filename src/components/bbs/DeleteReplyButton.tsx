"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function DeleteReplyButton({
  replyId,
  authorId,
}: {
  replyId: string;
  authorId: string;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const canDelete = user && (user.id === authorId || user.role === "admin");
  if (!canDelete) return null;

  async function handleDelete() {
    if (!confirm("确定删除这条回复？")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/replies/${replyId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
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
        className="text-xs text-red-500 underline-offset-2 transition hover:underline disabled:opacity-50"
      >
        {deleting ? "删除中…" : "删除"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
