"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function ReplyBox({
  postId,
  parentId,
  replyToNickname,
  onCancel,
}: {
  postId: string;
  /** 父回复 id：非空时处于"回复某人"子回复模式 */
  parentId?: string | null;
  replyToNickname?: string;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          parent_id: parentId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "回复失败");
      setContent("");
      // 退出子回复模式并刷新
      onCancel?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "回复失败");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
        <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
          登录
        </Link>{" "}
        后即可回复
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <h3 className="font-bold">{parentId ? "回复" : "发表回复"}</h3>
      {parentId && replyToNickname && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <span>正在回复 @{replyToNickname}</span>
          <button
            type="button"
            onClick={onCancel}
            className="font-medium underline-offset-2 hover:underline"
          >
            取消
          </button>
        </div>
      )}
      <textarea
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="友善交流，理性讨论"
        required
        maxLength={5000}
        autoFocus={Boolean(parentId)}
        className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "提交中…" : "回复"}
        </button>
      </div>
    </form>
  );
}
