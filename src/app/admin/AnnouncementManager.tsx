"use client";

import { useEffect, useState } from "react";
import type { Announcement } from "@/lib/types";
import { inputCls, btnPrimary, btnGhost, btnDanger } from "./page";

const emptyForm = { content: "", hours: "0" };

export default function AnnouncementManager() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/announcements", { cache: "no-store" });
      const data = await res.json();
      setItems(data.announcements ?? []);
    } catch {
      setMsg("❌ 加载失败");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/announcements", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setItems(data.announcements ?? []);
      } catch {
        if (!cancelled) setMsg("❌ 加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: form.content,
          hours: Number(form.hours) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发布失败");
      setForm(emptyForm);
      setMsg("✅ 公告已发布");
      await load();
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "发布失败"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Announcement) {
    if (!confirm("确定删除该公告？")) return;
    try {
      const res = await fetch(`/api/announcements/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setItems(items.filter((x) => x.id !== a.id));
      setMsg("✅ 已删除");
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "删除失败"}`);
    }
  }

  return (
    <div>
      {msg && <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{msg}</p>}

      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 className="mb-4 font-semibold">发布公告</h3>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">公告内容 *</span>
          <textarea
            className={inputCls}
            rows={3}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="展示在首页顶部的公告，例如：站点将于今晚维护…"
            maxLength={500}
            required
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">有效期（小时，0 = 长期）</span>
          <input
            type="number"
            className={inputCls}
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            min={0}
            max={8760}
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "发布中…" : "发布公告"}
          </button>
          <button type="button" onClick={() => setForm(emptyForm)} className={btnGhost}>
            清空
          </button>
        </div>
      </form>

      <h2 className="mb-4 text-lg font-semibold">公告列表（{items.length}）</h2>
      {loading ? (
        <p className="text-gray-500">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">还没有公告。</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-sm">{a.content}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {a.created_at.slice(0, 16).replace("T", " ")}
                  {a.expires_at
                    ? ` · ${a.expires_at.slice(0, 16).replace("T", " ")} 到期`
                    : " · 长期有效"}
                </p>
              </div>
              <button onClick={() => void handleDelete(a)} className={`${btnDanger} shrink-0`}>
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
