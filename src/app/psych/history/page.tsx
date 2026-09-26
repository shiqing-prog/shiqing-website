"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LevelKey, PsychResult } from "@/lib/psych/types";
import { scaleMeta } from "@/lib/psych/scales";

interface HistoryItem {
  id: string;
  scale_slug: string;
  scale_name: string;
  created_at: string;
  total: number;
  max: number;
  level: string;
  level_key: LevelKey;
  result: PsychResult | null;
}

const LEVEL_CLS: Record<LevelKey, string> = {
  good: "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300",
  info: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  mild: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  moderate:
    "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  severe: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function PsychHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/psych/results", { cache: "no-store" });
      if (res.status === 401) {
        setNeedLogin(true);
        return;
      }
      const data = (await res.json()) as { results?: HistoryItem[] };
      setItems(data.results ?? []);
    } catch {
      setError("加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function remove(id: string) {
    if (!confirm("确定删除这条测评记录吗？")) return;
    try {
      const res = await fetch(`/api/psych/results/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  /** 同一量表多次测评：对比最近两次 */
  function trendOf(slug: string, currentId: string) {
    const same = items.filter((x) => x.scale_slug === slug);
    const idx = same.findIndex((x) => x.id === currentId);
    if (idx < 0 || idx === same.length - 1) return null;
    const prev = same[idx + 1];
    const diff = items.find((x) => x.id === currentId)!.total - prev.total;
    return { prev, diff };
  }

  const meta = scaleMeta();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/psych" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 全部测评
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        📚 我的测评记录
      </h1>

      {loading ? (
        <p className="mt-8 text-gray-500">加载中…</p>
      ) : needLogin ? (
        <div className="kratos-card mt-6 p-8 text-center text-sm text-gray-500">
          登录后可以保存并查看自己的测评记录。
          <div className="mt-4">
            <Link href="/login?next=/psych/history" className="btn-grad px-4 py-2">
              去登录
            </Link>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="kratos-card mt-6 p-8 text-center text-sm text-gray-500">
          还没有测评记录。挑一个量表开始吧：
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {meta.slice(0, 4).map((s) => (
              <Link
                key={s.slug}
                href={`/psych/${s.slug}`}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <ul className="mt-6 flex flex-col gap-3">
            {items.map((it) => {
              const trend = trendOf(it.scale_slug, it.id);
              const open = openId === it.id;
              return (
                <li key={it.id} className="kratos-card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/psych/${it.scale_slug}`}
                      className="font-bold hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {it.scale_name}
                    </Link>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${LEVEL_CLS[it.level_key]}`}>
                      {it.level}
                    </span>
                    {!it.result?.hideScore && (
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {it.total} / {it.max}
                      </span>
                    )}
                    {trend && (
                      <span
                        className={`text-xs ${
                          trend.diff === 0
                            ? "text-gray-400"
                            : trend.diff > 0
                              ? "text-rose-500"
                              : "text-emerald-600"
                        }`}
                        title={`上次 ${trend.prev.total} 分（${fmt(trend.prev.created_at)}）`}
                      >
                        {trend.diff === 0
                          ? "与上次持平"
                          : trend.diff > 0
                            ? `较上次 +${trend.diff}`
                            : `较上次 ${trend.diff}`}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">{fmt(it.created_at)}</span>
                  </div>

                  {it.result && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {it.result.summary}
                    </p>
                  )}

                  {it.result?.breakdown && it.result.breakdown.length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : it.id)}
                        className="text-xs text-gray-500 transition hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                      >
                        {open ? "▾" : "▸"} 各维度得分
                      </button>
                      {open && (
                        <ul className="mt-2 flex flex-col gap-2">
                          {it.result.breakdown.map((b) => (
                            <li key={b.label}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-300">{b.label}</span>
                                <span className="text-gray-400">
                                  {b.value}/{b.max}
                                  {b.note ? ` · ${b.note}` : ""}
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                  style={{ width: `${b.percent}%` }}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex gap-3 text-xs">
                    <Link
                      href={`/psych/${it.scale_slug}`}
                      className="text-gray-500 transition hover:text-blue-600 dark:text-gray-400"
                    >
                      🔄 再测一次
                    </Link>
                    <button
                      type="button"
                      onClick={() => void remove(it.id)}
                      className="text-gray-400 transition hover:text-red-500"
                    >
                      🗑 删除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-6 text-center text-xs text-gray-400">
            记录仅你自己可见，随时可以删除。
          </p>
        </>
      )}
    </div>
  );
}
