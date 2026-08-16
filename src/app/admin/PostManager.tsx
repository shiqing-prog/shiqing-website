"use client";

import { useState } from "react";
import type { Post } from "@/lib/types";
import { useList, inputCls, btnPrimary, btnGhost, btnDanger } from "./page";

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  date: "",
  tags: "",
  published: true,
};

export default function PostManager() {
  const { items, setItems, loading, error, refresh } = useList<Post>(
    "/api/posts"
  );
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function startEdit(p: Post) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      date: p.date,
      tags: p.tags.join(", "),
      published: p.published,
    });
    setMsg("");
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        ...form,
        tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      };
      const url = editingId ? `/api/posts/${editingId}` : "/api/posts";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setMsg("✅ 已保存");
      setEditingId(null);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "保存失败"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Post) {
    if (!confirm(`确定删除文章「${p.title}」？`)) return;
    try {
      const res = await fetch(`/api/posts/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setItems(items.filter((x) => x.id !== p.id));
      setMsg("✅ 已删除");
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "删除失败"}`);
    }
  }

  const isEditing = editingId !== null;

  return (
    <div>
      {msg && <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{msg}</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">文章列表（{items.length}）</h2>
        <button onClick={startCreate} className={btnPrimary}>
          ＋ 写新文章
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 className="mb-4 font-semibold">
          {isEditing ? "编辑文章" : "写新文章"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">标题 *</span>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              slug（留空自动生成，仅小写字母/数字/中文/连字符）
            </span>
            <input
              className={inputCls}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">日期</span>
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">标签（逗号分隔）</span>
            <input
              className={inputCls}
              placeholder="Next.js, 前端"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">摘要</span>
            <textarea
              className={inputCls}
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">
              正文（空行分段；支持 # ## ### 标题与 1. 有序列表）
            </span>
            <textarea
              className={`${inputCls} font-mono`}
              rows={10}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) =>
                setForm({ ...form, published: e.target.checked })
              }
              className="h-4 w-4 accent-blue-600"
            />
            <span>发布（取消勾选则前台不显示）</span>
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setMsg("");
            }}
            className={btnGhost}
          >
            取消
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-gray-500">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">还没有文章，点击「写新文章」创建第一篇。</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  {!p.published && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      草稿
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                  /blog/{p.slug} · {p.date}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => startEdit(p)} className={btnGhost}>
                  编辑
                </button>
                <button onClick={() => handleDelete(p)} className={btnDanger}>
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
