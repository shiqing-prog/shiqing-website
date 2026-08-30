"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Board } from "@/lib/types";
import AttachmentUploader from "./AttachmentUploader";
import { useCurrentUser } from "@/lib/useCurrentUser";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function NewPostForm({ defaultBoard }: { defaultBoard?: string }) {
  const router = useRouter();
  const user = useCurrentUser();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState(defaultBoard ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((b: Board[]) => {
        setBoards(b);
        if (!defaultBoard && b.length > 0) setBoardId(b[0].id);
      })
      .catch(() => {});
  }, [defaultBoard]);

  if (user === null) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
        <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
          登录
        </Link>{" "}
        后才能发帖
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: boardId,
          title,
          content,
          attachments,
          tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发帖失败");
      router.push(`/bbs/post/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发帖失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">板块</span>
        <select
          className={inputCls}
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          required
        >
          <option value="" disabled>
            请选择板块
          </option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">标题</span>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="一句话说清楚主题"
          required
          maxLength={100}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">内容</span>
        <textarea
          rows={10}
          className={inputCls}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="支持换行分段，正文请保持友善"
          required
          maxLength={20000}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">标签（可选，逗号分隔，最多 5 个）</span>
        <input
          className={inputCls}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="如：教程, Next.js, 分享"
          maxLength={50}
        />
      </label>
      <div className="block text-sm">
        <span className="mb-1 block font-medium">附件（图片 / 文件）</span>
        <AttachmentUploader onChange={setAttachments} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "发布中…" : "发布帖子"}
        </button>
      </div>
    </form>
  );
}
