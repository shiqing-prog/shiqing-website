"use client";

import { useState } from "react";
import type { SigninGrid } from "@/lib/signinGrid";

export default function SignInCard({
  initial,
  grid,
  today,
}: {
  initial: { today: boolean; streak: number; total: number };
  /** 最近 N 周签到网格（服务端按中国时区生成） */
  grid?: SigninGrid;
  /** 今天（YYYY-MM-DD，中国时区） */
  today?: string;
}) {
  const [stats, setStats] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showGrid, setShowGrid] = useState(true);

  async function sign() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/signin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "签到失败");
      setStats({ today: true, streak: data.streak, total: stats.total + (data.ok ? 1 : 0) });
      setMsg(data.message ?? "✅ 签到成功！");
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "签到失败"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kratos-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">🔥 每日签到</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            已连续签到 <span className="font-bold text-orange-500">{stats.streak}</span> 天
            · 累计 {stats.total} 天
          </p>
          {msg && <p className="mt-1 text-xs text-green-600 dark:text-green-400">{msg}</p>}
        </div>
        <button
          type="button"
          onClick={() => void sign()}
          disabled={busy || stats.today}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
            stats.today
              ? "cursor-default border border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
              : "btn-grad"
          }`}
        >
          {stats.today ? "✅ 今日已签" : busy ? "签到中…" : "签到"}
        </button>
      </div>

      {/* 近 14 周签到热力图 */}
      {grid && grid.columns.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className="text-xs text-gray-500 transition hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            {showGrid ? "▾" : "▸"} 近 14 周签到（{grid.total} 天）
          </button>
          {showGrid && (
            <div className="mt-2 overflow-x-auto">
              <div className="flex gap-[3px]">
                <div className="mr-1 flex flex-col gap-[3px] text-[9px] leading-[12px] text-gray-400">
                  {grid.weekLabels.map((w, i) => (
                    <span key={i} className="h-3">
                      {w}
                    </span>
                  ))}
                </div>
                {grid.columns.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-[3px]">
                    {col.map((cell) => {
                      const signed = cell.signed || (cell.day === today && stats.today);
                      return (
                        <span
                          key={cell.day}
                          title={`${cell.day}${signed ? " 已签到" : ""}`}
                          className={`h-3 w-3 rounded-sm ${
                            cell.future
                              ? "bg-transparent"
                              : signed
                                ? "bg-gradient-to-br from-orange-400 to-amber-500"
                                : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-1 flex text-[9px] text-gray-400">
                {/* 左侧周标签占位（3 个字符宽 + margin） */}
                <span className="w-[18px] shrink-0" />
                {grid.months.map((m, i) => {
                  const next = grid.months[i + 1]?.col ?? grid.columns.length;
                  return (
                    <span
                      key={`${m.col}-${m.label}`}
                      style={{ width: (next - m.col) * 15 - 3 }}
                      className="shrink-0 overflow-visible whitespace-nowrap"
                    >
                      {m.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
