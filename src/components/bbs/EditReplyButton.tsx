"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function EditReplyButton({
  replyId,
  authorId,
  initialContent,
}: {
  replyId: string;
  authorId: string;
  initialContent: string;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canEdit = user && user.id === authorId;
  if (!canEdit) return null;

  async function save() {
    if (!content.trim()) {
      setError("内容不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/replies/${replyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <span className="inline-flex flex-col items-end gap-1.5">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={5000}
          autoFocus
          className="w-72 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <span className="flex gap-1.5">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setContent(initialContent);
              setError("");
            }}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
          >
            取消
          </button>
        </span>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-xs text-gray-500 underline-offset-2 transition hover:text-blue-600 hover:underline dark:text-gray-400"
    >
      编辑
    </button>
  );
}
