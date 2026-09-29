"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fmtDateTime } from "@/lib/time";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface RequestRow {
  id: number;
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

interface ListResp {
  code: number;
  msg: string;
  data: { pending: number; rows: RequestRow[] } | null;
}

const PLAN_OPTIONS = [
  { value: "basic", label: "基础版 basic" },
  { value: "pro", label: "进阶版 pro" },
  { value: "vip", label: "旗舰版 vip" },
];

function statusClass(status: number): string {
  if (status === 1) return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
  if (status === 2) return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
}

/**
 * 主页卡密申请面板
 *
 * 流程：登录用户提交申请 → 管理员在后台审核 → 通过后自动发卡 →
 * 用户在这里复制卡密，去「个人设置 → 卡密兑换」把权益绑定到账号。
 * 未登录时只显示入口与说明，不渲染表单。
 */
export default function CardRequestPanel() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [pending, setPending] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState("basic");
  const [days, setDays] = useState(30);
  const [quota, setQuota] = useState(0);
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/card/request", { cache: "no-store" });
      if (!res.ok) {
        setRows([]);
        setPending(0);
        return;
      }
      const data = (await res.json()) as ListResp;
      if (data.code === 0 && data.data) {
        setRows(data.data.rows);
        setPending(data.data.pending);
      }
    } catch {
      /* 网络失败保持空态 */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // 未登录时不请求；先 await 一次以脱离 effect 同步阶段（避免级联渲染告警）
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled || !user) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, load]);

  async function submit() {
    if (reason.trim().length < 5) {
      setMsg("❌ 申请理由至少 5 个字");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/card/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, days, quota, reason: reason.trim(), contact: contact.trim() }),
      });
      const data = (await res.json()) as ListResp;
      if (!res.ok || data.code !== 0) throw new Error(data.msg || `提交失败（${res.status}）`);
      setMsg(`✅ ${data.msg}`);
      setReason("");
      setContact("");
      await load();
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "提交失败"}`);
    } finally {
      setBusy(false);
    }
  }

  const approved = rows.filter((r) => r.status === 1 && r.cardKey);
  const summary = !user
    ? "登录后可提交申请"
    : pending > 0
      ? `待审核 ${pending} 条`
      : approved.length > 0
        ? `已通过 ${approved.length} 条`
        : "暂未申请";

  return (
    <div className="kratos-card mb-6 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="border-l-4 border-blue-600 pl-3 text-base font-bold">🎫 卡密申请</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {summary}
        </span>
        <p className="hidden text-xs text-gray-500 sm:block dark:text-gray-400">
          填写用途提交申请，管理员审核通过后自动发放卡密
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-200"
        >
          {open ? "收起 ▲" : "我要申请 ▼"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          {!user ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Link href="/login?next=/" className="text-blue-600 hover:underline dark:text-blue-400">
                登录
              </Link>{" "}
              后即可提交卡密申请，申请记录与账号绑定。
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  套餐
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  >
                    {PLAN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  期望有效期（天）
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value) || 0)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  期望次数（0 = 不限）
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={quota}
                    onChange={(e) => setQuota(Number(e.target.value) || 0)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  联系方式（留空用注册邮箱）
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="QQ 或邮箱"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500 sm:col-span-2 dark:text-gray-400">
                  申请理由（5-200 字）
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={200}
                    placeholder="说明用途，例如：个人词库工具自用 / 小团队内部分发…"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={busy || pending >= 1}
                  className="btn-grad px-5 py-2 text-sm disabled:opacity-50"
                >
                  {busy ? "提交中…" : "提交申请"}
                </button>
                {pending >= 1 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    已有待审核的申请，请等管理员处理后再提交
                  </span>
                )}
              </div>
              {msg && <p className="mt-2 text-sm">{msg}</p>}
            </>
          )}

          {/* 申请记录 */}
          {user && loaded && rows.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                我的申请（{rows.length}）
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${statusClass(r.status)}`}>
                        {r.statusText}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {r.plan} · {r.days} 天 · {r.quota === 0 ? "不限次" : `${r.quota} 次`}
                      </span>
                      <span className="ml-auto text-gray-400">
                        {fmtDateTime(new Date(r.createdAt * 1000).toISOString())}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">{r.reason}</p>
                    {r.reviewNote && (
                      <p className="mt-1 text-gray-500 dark:text-gray-400">审核备注：{r.reviewNote}</p>
                    )}
                    {r.status === 1 && r.cardKey && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] dark:bg-gray-800">
                          {r.cardKey}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(r.cardKey);
                            setMsg("✅ 卡密已复制，去「个人设置 → 卡密兑换」入账");
                          }}
                          className="rounded border border-gray-300 px-2 py-0.5 text-[11px] transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700"
                        >
                          复制
                        </button>
                        <Link
                          href="/settings"
                          className="text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                        >
                          去兑换 →
                        </Link>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
