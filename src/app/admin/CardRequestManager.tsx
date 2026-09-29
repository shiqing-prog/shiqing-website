"use client";

import { useCallback, useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { fmtDateTime } from "@/lib/time";
import { inputCls, btnPrimary, btnGhost, btnDanger } from "./page";

interface RequestRow {
  id: number;
  userId: string;
  userNickname: string | null;
  plan: string;
  days: number;
  quota: number;
  reason: string;
  contact: string;
  status: number;
  statusText: string;
  cardKey: string;
  reviewNote: string;
  reviewedAt: number;
  createdAt: number;
}

interface ApiResp<T> {
  code: number;
  msg: string;
  data: T | null;
}

type Filter = "0" | "1" | "2" | "all";

/** 审核时对单条申请的临时编辑值（管理员可覆盖申请里的套餐/天数/次数） */
interface Draft {
  plan: string;
  days: number;
  quota: number;
  note: string;
}

function ts(sec: number): string {
  if (!sec) return "-";
  return fmtDateTime(new Date(sec * 1000).toISOString());
}

function statusCls(status: number): string {
  if (status === 1) return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
  if (status === 2) return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
}

/**
 * 卡密申请审核（管理员）
 * 通过 → 服务端按（可覆盖的）plan/days/quota 自动生成一张卡密并回填；
 * 拒绝 → 只写备注。数据走 /api/card/request/*，页面不需要输入任何密钥。
 */
export default function CardRequestManager() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("0");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(0);
  const [msg, setMsg] = useState("");
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const size = 20;

  const load = useCallback(
    async (pageNum: number, status: Filter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          size: String(size),
        });
        if (status !== "all") params.set("status", status);
        const res = await fetch(`/api/card/request/list?${params.toString()}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as ApiResp<{
          rows: RequestRow[];
          total: number;
          pending: number;
        }>;
        if (!res.ok || data.code !== 0 || !data.data) {
          throw new Error(data.msg || `加载失败（${res.status}）`);
        }
        setRows(data.data.rows);
        setTotal(data.data.total);
        setPending(data.data.pending);
        setPage(pageNum);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const r of data.data!.rows) {
            if (!next[r.id]) {
              next[r.id] = { plan: r.plan, days: r.days, quota: r.quota, note: "" };
            }
          }
          return next;
        });
        setMsg("");
      } catch (err) {
        setMsg(`❌ ${err instanceof Error ? err.message : "加载失败"}`);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await load(1, filter);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, filter]);

  function setDraft(id: number, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { plan: "", days: 30, quota: 0, note: "" }), ...patch },
    }));
  }

  async function review(row: RequestRow, action: "approve" | "reject") {
    const draft = drafts[row.id];
    if (action === "approve" && !confirm(`确认通过申请 #${row.id} 并发放卡密？`)) return;
    setBusyId(row.id);
    setMsg("");
    try {
      const res = await fetch("/api/card/request/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          action,
          note: draft?.note ?? "",
          plan: draft?.plan || row.plan,
          days: draft?.days ?? row.days,
          quota: draft?.quota ?? row.quota,
        }),
      });
      const data = (await res.json()) as ApiResp<{ cardKey?: string }>;
      if (!res.ok || data.code !== 0) throw new Error(data.msg || "操作失败");
      setMsg(
        action === "approve"
          ? `✅ 已通过，发卡：${data.data?.cardKey ?? ""}`
          : "✅ 已拒绝"
      );
      await load(page, filter);
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "操作失败"}`);
    } finally {
      setBusyId(0);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className="flex flex-col gap-4">
      {msg && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
          {msg}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h3 className="border-l-4 border-blue-600 pl-2.5 text-sm font-bold">卡密申请审核</h3>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          待审核 {pending}
        </span>
        <select
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          <option value="0">待审核</option>
          <option value="1">已通过</option>
          <option value="2">已拒绝</option>
          <option value="all">全部</option>
        </select>
        <button type="button" onClick={() => void load(page, filter)} className={btnGhost}>
          刷新
        </button>
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          共 {total} 条 · 第 {page}/{totalPages} 页
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">加载中…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">没有符合条件的申请</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const draft = drafts[row.id];
            return (
              <li key={row.id} className="kratos-card p-4 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCls(row.status)}`}>
                    {row.statusText}
                  </span>
                  <span className="text-xs text-gray-400">#{row.id}</span>
                  <span className="font-medium">
                    {row.userNickname || row.userId.slice(0, 8)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    联系：{row.contact || "-"}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">{ts(row.createdAt)}</span>
                </div>

                <p className="mt-1.5 text-gray-700 dark:text-gray-200">{row.reason}</p>

                {row.status === 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      套餐
                      <input
                        className={inputCls}
                        value={draft?.plan ?? row.plan}
                        onChange={(e) => setDraft(row.id, { plan: e.target.value })}
                        maxLength={16}
                      />
                    </label>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      天数
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        className={inputCls}
                        value={draft?.days ?? row.days}
                        onChange={(e) => setDraft(row.id, { days: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      次数（0=不限）
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        value={draft?.quota ?? row.quota}
                        onChange={(e) => setDraft(row.id, { quota: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      审核备注
                      <input
                        className={inputCls}
                        value={draft?.note ?? ""}
                        onChange={(e) => setDraft(row.id, { note: e.target.value })}
                        maxLength={200}
                        placeholder="可选"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {row.plan} · {row.days} 天 ·{" "}
                      {row.quota === 0 ? "不限次" : `${row.quota} 次`}
                    </span>
                    {row.reviewNote && <span>备注：{row.reviewNote}</span>}
                    <span>审核于 {ts(row.reviewedAt)}</span>
                  </div>
                )}

                {row.status === 0 ? (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void review(row, "approve")}
                      className={btnPrimary}
                    >
                      {busyId === row.id ? "处理中…" : "通过并自动发卡"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void review(row, "reject")}
                      className={btnDanger}
                    >
                      拒绝
                    </button>
                  </div>
                ) : (
                  row.cardKey && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800">
                        {row.cardKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copyText(row.cardKey)}
                        className={btnGhost}
                      >
                        复制
                      </button>
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => void load(page - 1, filter)}
            className={btnGhost}
          >
            ← 上一页
          </button>
          <span className="text-xs text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => void load(page + 1, filter)}
            className={btnGhost}
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  );
}
