"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/time";
import { REPORT_REASONS } from "@/lib/types";
import { inputCls, btnPrimary, btnGhost, btnDanger } from "./page";

interface ReportRow {
  id: string;
  target_type: "post" | "reply";
  target_id: string;
  reporter_id: string;
  reporter_nickname?: string | null;
  target_title?: string | null;
  target_excerpt?: string | null;
  target_author?: string | null;
  reason: string;
  detail: string;
  status: number;
  note: string;
  /** 秒级时间戳（举报表存的不是 ISO） */
  created_at: number;
}

function ts(sec: number): string {
  if (!sec) return "-";
  return fmtDateTime(new Date(sec * 1000).toISOString());
}

type Filter = "0" | "1" | "2" | "all";

const REASON_LABEL: Record<string, string> = REPORT_REASONS as unknown as Record<string, string>;

export default function ReportManager() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [pending, setPending] = useState(0);
  const [filter, setFilter] = useState<Filter>("0");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const url = filter === "all" ? "/api/admin/reports" : `/api/admin/reports?status=${filter}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setRows(data.reports ?? []);
      setPending(data.pending ?? 0);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "delete" | "reject") {
    setBusy(id + action);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action, note: notes[id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["0", "待处理"],
            ["1", "已删除内容"],
            ["2", "已驳回"],
            ["all", "全部"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-[2px] border px-3 py-1.5 text-sm transition ${
              filter === key
                ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {label}
            {key === "0" && pending > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{pending}</span>
            )}
          </button>
        ))}
        <button onClick={load} className={btnGhost}>
          刷新
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">没有记录。</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-[2px] border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="rounded-[2px] bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                  {r.target_type === "post" ? "帖子" : "回复"}
                </span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {REASON_LABEL[r.reason] ?? r.reason}
                </span>
                <span>· 举报人 {r.reporter_nickname || r.reporter_id}</span>
                <span>· {ts(r.created_at)}</span>
                {r.status !== 0 && (
                  <span className="ml-auto">
                    {r.status === 1 ? "已删除内容" : "已驳回"}
                  </span>
                )}
              </div>

              <p className="mt-2 font-medium">
                {r.target_title || (r.target_excerpt ? r.target_excerpt.slice(0, 60) : r.target_id)}
              </p>
              {r.target_author && (
                <p className="mt-1 text-xs text-gray-500">作者：{r.target_author}</p>
              )}
              {r.target_excerpt && (
                <p className="mt-1 line-clamp-3 rounded-[2px] bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  {r.target_excerpt}
                </p>
              )}
              {r.detail && <p className="mt-2 text-xs text-gray-500">补充：{r.detail}</p>}
              {r.note && <p className="mt-1 text-xs text-gray-400">处理备注：{r.note}</p>}

              {r.status === 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value.slice(0, 200) }))}
                    placeholder="处理备注（选填，会记入举报记录）"
                    className={`${inputCls} max-w-xs`}
                  />
                  <button
                    onClick={() => act(r.id, "delete")}
                    disabled={busy !== ""}
                    className={btnDanger}
                  >
                    {busy === r.id + "delete" ? "处理中…" : "删除内容并结案"}
                  </button>
                  <button
                    onClick={() => act(r.id, "reject")}
                    disabled={busy !== ""}
                    className={btnPrimary}
                  >
                    {busy === r.id + "reject" ? "处理中…" : "驳回举报"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
