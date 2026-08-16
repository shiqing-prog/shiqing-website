"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { useList, inputCls, btnPrimary, btnGhost, btnDanger } from "./page";

const emptyForm = {
  title: "",
  description: "",
  tech: "",
  link: "",
  github: "",
  featured: false,
  createdAt: "",
};

export default function ProjectManager() {
  const { items, setItems, loading, error, refresh } = useList<Project>(
    "/api/projects"
  );
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function startEdit(p: Project) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description,
      tech: p.tech.join(", "),
      link: p.link ?? "",
      github: p.github ?? "",
      featured: p.featured,
      createdAt: p.createdAt,
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
        tech: form.tech.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      };
      const url = editingId ? `/api/projects/${editingId}` : "/api/projects";
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

  async function handleDelete(p: Project) {
    if (!confirm(`确定删除项目「${p.title}」？`)) return;
    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
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
        <h2 className="text-lg font-semibold">项目列表（{items.length}）</h2>
        <button onClick={startCreate} className={btnPrimary}>
          ＋ 新增项目
        </button>
      </div>

      {/* 表单 */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 className="mb-4 font-semibold">
          {isEditing ? "编辑项目" : "新增项目"}
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
            <span className="mb-1 block font-medium">日期</span>
            <input
              type="date"
              className={inputCls}
              value={form.createdAt}
              onChange={(e) => setForm({ ...form, createdAt: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">描述 *</span>
            <textarea
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">技术栈（逗号分隔）</span>
            <input
              className={inputCls}
              placeholder="Next.js, React, TypeScript"
              value={form.tech}
              onChange={(e) => setForm({ ...form, tech: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">在线链接</span>
            <input
              className={inputCls}
              placeholder="https://..."
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">GitHub</span>
            <input
              className={inputCls}
              placeholder="https://github.com/..."
              value={form.github}
              onChange={(e) => setForm({ ...form, github: e.target.value })}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) =>
                setForm({ ...form, featured: e.target.checked })
              }
              className="h-4 w-4 accent-blue-600"
            />
            <span>设为精选（显示在首页）</span>
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

      {/* 列表 */}
      {loading ? (
        <p className="text-gray-500">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">还没有项目，点击「新增项目」创建第一个。</p>
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
                  {p.featured && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                      ★ 精选
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                  {p.description}
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
