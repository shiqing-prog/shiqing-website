"use client";

import { useCallback, useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { fmtDateTime } from "@/lib/time";
import type { CardStats } from "@/lib/types";
import { inputCls, btnPrimary, btnGhost, btnDanger } from "./page";

interface CardRow {
  card_key: string;
  prefix: string;
  plan: string;
  days: number;
  quota: number;
  used: number;
  bound_qq: string;
  bound_user_id: string;
  bound_user_nickname?: string | null;
  redeemed_at: number;
  expired_at: number;
  created_at: number;
  used_at: number;
  status: number;
  remark: string;
}

interface ApiResp<T> {
  code: number;
  msg: string;
  data: T | null;
}

/** 秒级时间戳 → 中国时区可读时间 */
function fmtTs(sec: number): string {
  if (!sec) return "未激活";
  return fmtDateTime(new Date(sec * 1000).toISOString());
}

function isExpired(row: CardRow): boolean {
  return row.expired_at !== 0 && row.expired_at * 1000 < Date.now();
}

/**
 * 卡密管理（管理员）
 * 数据走 /api/card/*（管理员登录态鉴权，页面不需要输入任何密钥）
 */
export default function CardManager() {
  const [stats, setStats] = useState<CardStats | null>(null);
  const [rows, setRows] = useState<CardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "1" | "0">("all");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [generated, setGenerated] = useState<string[]>([]);

  const [prefix, setPrefix] = useState("sec");
  const [plan, setPlan] = useState("basic");
  const [count, setCount] = useState(10);
  const [days, setDays] = useState(30);
  const [quota, setQuota] = useState(0);
  const [remark, setRemark] = useState("");
  const [activate, setActivate] = useState<"on_first_use" | "immediate">("on_first_use");

  const size = 20;

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          size: String(size),
        });
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (appliedKeyword) params.set("q", appliedKeyword);

        const [listRes, statsRes] = await Promise.all([
          fetch(`/api/card/list?${params.toString()}`, { cache: "no-store" }),
          fetch("/api/card/stats", { cache: "no-store" }),
        ]);
        const list = (await listRes.json()) as ApiResp<{
          rows: CardRow[];
          total: number;
        }>;
        if (!listRes.ok || list.code !== 0 || !list.data) {
          throw new Error(list.msg || `加载失败（${listRes.status}）`);
        }
        setRows(list.data.rows);
        setTotal(list.data.total);
        setPage(pageNum);

        if (statsRes.ok) {
          const s = (await statsRes.json()) as ApiResp<CardStats>;
          if (s.code === 0) setStats(s.data);
        }
        setMsg("");
      } catch (err) {
        setMsg(`❌ ${err instanceof Error ? err.message : "加载失败"}`);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, appliedKeyword]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await load(1);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function generate() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/card/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, plan, count, days, quota, remark, activate }),
      });
      const data = (await res.json()) as ApiResp<{ count: number; keys: string[] }>;
      if (!res.ok || data.code !== 0 || !data.data) {
        throw new Error(data.msg || "生成失败");
      }
      setGenerated(data.data.keys);
      setMsg(
        `✅ 已生成 ${data.data.count} 张卡密（${
          activate === "immediate" ? "立即开始计时" : "首次使用时开始计时"
        }）`
      );
      await load(1);
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "生成失败"}`);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(key: string) {
    if (!confirm(`确定吊销卡密 ${key} ？吊销后无法再使用。`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/card/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = (await res.json()) as ApiResp<{ affected: number }>;
      if (!res.ok || data.code !== 0) throw new Error(data.msg || "吊销失败");
      setMsg(data.data?.affected ? "✅ 已吊销" : "⚠️ 卡密不存在或已是吊销状态");
      await load(page);
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "吊销失败"}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyAll() {
    const ok = await copyText(generated.join("\n"));
    setMsg(ok ? `✅ 已复制 ${generated.length} 张卡密` : "❌ 复制失败");
  }

  function downloadAll() {
    const blob = new Blob([generated.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cards-${plan}-${generated.length}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className="flex flex-col gap-6">
      {msg && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
          {msg}
        </p>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ["总数", stats.total, "📇"],
              ["可用", stats.available, "✅"],
              ["已用", stats.used, "🔓"],
              ["已激活", stats.activated, "⏱"],
              ["已过期", stats.expired, "⌛"],
              ["已吊销", stats.revoked, "🚫"],
            ] as [string, number, string][]
          ).map(([label, value, icon]) => (
            <div key={label} className="kratos-card p-4 text-center">
              <p className="text-lg">{icon}</p>
              <p className="mt-1 text-xl font-bold">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      <section className="kratos-card p-5">
        <h3 className="border-l-4 border-blue-600 pl-2.5 text-sm font-bold">生成卡密</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">前缀（仅字母）</span>
            <input
              className={inputCls}
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              maxLength={16}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">套餐标识</span>
            <input
              className={inputCls}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              maxLength={16}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">数量（1-1000）</span>
            <input
              type="number"
              className={inputCls}
              value={count}
              min={1}
              max={1000}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">有效天数（1-3650）</span>
            <input
              type="number"
              className={inputCls}
              value={days}
              min={1}
              max={3650}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">次数上限（0=不限）</span>
            <input
              type="number"
              className={inputCls}
              value={quota}
              min={0}
              onChange={(e) => setQuota(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">计时方式</span>
            <select
              className={inputCls}
              value={activate}
              onChange={(e) => setActivate(e.target.value as "on_first_use" | "immediate")}
            >
              <option value="on_first_use">首次使用时开始计时（推荐）</option>
              <option value="immediate">生成后立即开始计时</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">备注（可选）</span>
            <input
              className={inputCls}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={200}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={() => void generate()} disabled={busy} className={btnPrimary}>
            {busy ? "处理中…" : "生成"}
          </button>
          <span className="text-xs text-gray-400">
            卡密格式：<code>{prefix || "sec"}_{plan || "basic"}_32位随机码</code>
          </span>
        </div>

        {generated.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">本次生成（{generated.length} 张）</h4>
              <button type="button" onClick={() => void copyAll()} className={btnGhost}>
                复制全部
              </button>
              <button type="button" onClick={downloadAll} className={btnGhost}>
                下载 txt
              </button>
            </div>
            <textarea
              readOnly
              value={generated.join("\n")}
              rows={Math.min(generated.length, 8)}
              className={`${inputCls} mt-2 font-mono text-xs`}
            />
          </div>
        )}
      </section>

      <section className="kratos-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="border-l-4 border-blue-600 pl-2.5 text-sm font-bold">卡密列表</h3>
          <select
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "1" | "0")}
          >
            <option value="all">全部状态</option>
            <option value="1">正常</option>
            <option value="0">已吊销</option>
          </select>
          <input
            className="w-56 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="搜索卡密 / QQ / 备注"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setAppliedKeyword(keyword.trim());
            }}
          />
          <button type="button" onClick={() => setAppliedKeyword(keyword.trim())} className={btnGhost}>
            搜索
          </button>
          <button type="button" onClick={() => void load(page)} className={btnGhost}>
            刷新
          </button>
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            共 {total} 张 · 第 {page}/{totalPages} 页
          </span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">加载中…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">没有符合条件的卡密</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-2 pr-3 font-medium">卡密</th>
                  <th className="py-2 pr-3 font-medium">套餐</th>
                  <th className="py-2 pr-3 font-medium">次数</th>
                  <th className="py-2 pr-3 font-medium">绑定 QQ</th>
                  <th className="py-2 pr-3 font-medium">绑定账号</th>
                  <th className="py-2 pr-3 font-medium">到期</th>
                  <th className="py-2 pr-3 font-medium">状态</th>
                  <th className="py-2 pr-3 font-medium">备注</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.card_key} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => void copyText(row.card_key)}
                        title="点击复制"
                        className="font-mono text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {row.card_key}
                      </button>
                    </td>
                    <td className="py-2 pr-3">{row.plan}</td>
                    <td className="py-2 pr-3">
                      {row.used}/{row.quota === 0 ? "∞" : row.quota}
                    </td>
                    <td className="py-2 pr-3 font-mono">{row.bound_qq || "-"}</td>
                    <td className="py-2 pr-3">
                      {row.bound_user_nickname ? (
                        <span title={row.bound_user_id}>{row.bound_user_nickname}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2 pr-3">{fmtTs(row.expired_at)}</td>
                    <td className="py-2 pr-3">
                      {row.status !== 1 ? (
                        <span className="text-red-500">已吊销</span>
                      ) : row.redeemed_at !== 0 ? (
                        <span className="text-sky-600">已兑换到账号</span>
                      ) : isExpired(row) ? (
                        <span className="text-amber-600">已过期</span>
                      ) : row.quota > 0 && row.used >= row.quota ? (
                        <span className="text-gray-500">次数已用完</span>
                      ) : (
                        <span className="text-emerald-600">可用</span>
                      )}
                    </td>
                    <td
                      className="max-w-[12rem] truncate py-2 pr-3 text-gray-500 dark:text-gray-400"
                      title={row.remark}
                    >
                      {row.remark || "-"}
                    </td>
                    <td className="py-2">
                      {row.status === 1 && (
                        <button
                          type="button"
                          onClick={() => void revoke(row.card_key)}
                          className={btnDanger}
                        >
                          吊销
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => void load(page - 1)}
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
              onClick={() => void load(page + 1)}
              className={btnGhost}
            >
              下一页 →
            </button>
          </div>
        )}
      </section>

      <section className="kratos-card p-5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">外部词库接入说明</h3>
        <p className="mt-2">
          校验：<code>POST /api/card/verify</code>，消费：<code>POST /api/card/consume</code>；
          请求头 <code>Authorization: Bearer &lt;CARD_API_TOKEN&gt;</code>。
        </p>
        <p className="mt-1">
          请求体：<code>{`{ "key": "卡密", "qq": "123456", "request_id": "可选幂等键" }`}</code>；
          响应：<code>{`{ code, msg, data: { valid, reason, plan, expired_at, quota, used, bound_qq } }`}</code>。
        </p>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          时间字段均为秒级 Unix 时间戳；<code>expired_at = 0</code> 表示尚未激活（首次消费开始计时）。
          完整文档见仓库 <code>docs/card-api.md</code>。
        </p>
      </section>
    </div>
  );
}
