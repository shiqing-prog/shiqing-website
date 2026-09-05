"use client";

import { useState } from "react";

export default function SignInCard({
  initial,
}: {
  initial: { today: boolean; streak: number; total: number };
}) {
  const [stats, setStats] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

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
    <div className="kratos-card flex items-center justify-between p-5">
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
  );
}
