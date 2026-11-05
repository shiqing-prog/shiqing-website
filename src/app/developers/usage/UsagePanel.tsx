"use client";

import { useState } from "react";
import { fmtDateTime } from "@/lib/time";

interface UsageResp {
  ok: boolean;
  cardKey: string;
  plan: string | null;
  expiredAt: number;
  daily: { used: number; limit: number; remaining: number };
  token: string | null;
  error?: string;
  message?: string;
}

export default function UsagePanel() {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<UsageResp | null>(null);
  const [error, setError] = useState("");

  async function query(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/developers/usage", {
        method: "POST",
        headers: { authorization: `Bearer ${key.trim()}` },
      });
      const body = (await res.json()) as UsageResp;
      if (!res.ok) {
        throw new Error(body.message || body.error || `查询失败（${res.status}）`);
      }
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "查询失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={query} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="QB-XXXX-XXXX-XXXX-XXXX 或 sk_..."
          autoComplete="off"
          className="w-full rounded-[2px] border border-gray-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          disabled={busy || key.trim().length === 0}
          className="shrink-0 rounded-[2px] bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "查询中…" : "查询"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {data && (
        <div className="kratos-card mt-5 p-5">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-sm text-gray-500">{data.cardKey}</p>
            <p className="text-xs text-gray-400">
              {data.plan ? `套餐 ${data.plan}` : "未标套餐"}
              {data.expiredAt > 0 ? ` · 到期 ${fmtDateTime(new Date(data.expiredAt * 1000).toISOString())}` : " · 永久"}
            </p>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                今日已用 {data.daily.used} / {data.daily.limit}
              </span>
              <span className="text-xs text-gray-500">剩余 {data.daily.remaining}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full rounded-full transition-all ${
                  data.daily.used / data.daily.limit > 0.8 ? "bg-red-500" : "bg-blue-600"
                }`}
                style={{ width: `${Math.min((data.daily.used / data.daily.limit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {data.token && (
            <p className="mt-3 text-xs text-gray-500">本次使用的是令牌 {data.token}</p>
          )}
        </div>
      )}
    </>
  );
}
