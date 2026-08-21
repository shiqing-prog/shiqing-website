"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BbsPost, PublicUser } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function EditPostForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [post, setPost] = useState<BbsPost | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch(`/api/posts/${postId}`).then((r) => r.json()),
    ])
      .then(([auth, detail]) => {
        setUser(auth.user ?? null);
        if (detail.post) {
          setPost(detail.post);
          setTitle(detail.post.title);
          setContent(detail.post.content);
        } else {
          setError("帖子不存在");
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) return <p className="text-gray-500">加载中…</p>;

  if (!post) {
    return (
      <div className="kratos-card p-8 text-center text-gray-500">
        {error || "帖子不存在"}，
        <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
          返回首页
        </Link>
      </div>
    );
  }

  if (!user || user.id !== post.author_id) {
    return (
      <div className="kratos-card p-8 text-center text-sm text-gray-500">
        只有帖子作者可以编辑，
        <Link href={`/bbs/post/${post.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
          返回帖子
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      router.push(`/bbs/post/${postId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">标题</span>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={100}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">内容</span>
        <textarea
          rows={12}
          className={inputCls}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          maxLength={20000}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存修改"}
        </button>
        <Link
          href={`/bbs/post/${postId}`}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
