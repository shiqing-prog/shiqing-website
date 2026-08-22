"use client";

import { useState } from "react";
import type { BbsPost } from "@/lib/types";
import { useList, btnPrimary, btnGhost, btnDanger } from "./page";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function BbsManager() {
  const { items, setItems, loading, error, refresh } = useList<BbsPost>(
    "/api/posts"
  );
  const [msg, setMsg] = useState("");

  async function toggleSticky(p: BbsPost) {
    try {
      const res = await fetch(`/api/posts/${p.id}/sticky`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sticky: p.sticky !== 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      setMsg(`✅ 已${p.sticky === 1 ? "取消置顶" : "置顶"}`);
      await refresh();
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "操作失败"}`);
    }
  }

  async function handleDelete(p: BbsPost) {
    if (!confirm(`确定删除帖子「${p.title}」？回复会一并删除。`)) return;
    try {
      const res = await fetch(`/api/posts/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setItems(items.filter((x) => x.id !== p.id));
      setMsg("✅ 已删除");
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "删除失败"}`);
    }
  }

  return (
    <div>
      {msg && <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{msg}</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">帖子管理（{items.length}）</h2>
        <button onClick={() => void refresh()} className={btnGhost}>
          刷新
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">暂无帖子</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3.5 dark:border-gray-800"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {p.sticky === 1 && (
                    <span className="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">
                      置顶
                    </span>
                  )}
                  <span className="truncate font-medium">{p.title}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {p.author_nickname} · {fmtTime(p.created_at)} · 💬{" "}
                  {p.reply_count ?? 0} · 👁 {(p.view_count ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => toggleSticky(p)} className={btnPrimary}>
                  {p.sticky === 1 ? "取消置顶" : "置顶"}
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
