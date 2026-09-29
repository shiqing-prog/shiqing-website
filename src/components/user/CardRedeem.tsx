"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fmtDateTime } from "@/lib/time";
import type { UserPlan } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface RedeemedCard {
  card_key: string;
  plan: string;
  days: number;
  quota: number;
  redeemed_at: number;
}

interface MeResp {
  code: number;
  msg: string;
  data: {
    plan: UserPlan;
    cards: RedeemedCard[];
  } | null;
}

/**
 * 卡密兑换（登录账号权益）
 * 与站点其它功能共用同一张 users 表与 bbs_session 登录态
 */
export default function CardRedeem() {
  const user = useCurrentUser();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [cards, setCards] = useState<RedeemedCard[]>([]);
  const [cardKey, setCardKey] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/card/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as MeResp;
      if (data.code === 0 && data.data) {
        setPlan(data.data.plan);
        setCards(data.data.cards);
      }
    } catch {
      /* 忽略：未登录或网络失败时保持空态 */
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
  }, [load, user]);

  async function redeem() {
    const key = cardKey.trim();
    if (!key) {
      setMsg("❌ 请输入卡密");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/card/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = (await res.json()) as {
        code: number;
        msg: string;
        data?: {
          redeemed?: boolean;
          duplicate?: boolean;
          plan?: UserPlan;
          reason?: string;
          message?: string;
        } | null;
      };
      if (!res.ok) throw new Error(data.msg || `兑换失败（${res.status}）`);
      if (data.code !== 0 || !data.data?.redeemed) {
        throw new Error(data.data?.message || data.msg || "卡密无效");
      }
      if (data.data.plan) setPlan(data.data.plan);
      setMsg(data.data.duplicate ? "ℹ️ 这张卡密已经兑换过了，权益如下" : "✅ 兑换成功");
      setCardKey("");
      await load();
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "兑换失败"}`);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="kratos-card p-6 text-sm text-gray-500">
        <Link href="/login?next=/settings" className="text-blue-600 hover:underline dark:text-blue-400">
          登录
        </Link>{" "}
        后可以兑换卡密并把权益绑定到账号。
      </div>
    );
  }

  return (
    <div className="kratos-card p-6">
      <h2 className="font-semibold">🎫 卡密兑换</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        兑换后权益绑定到当前账号（与论坛/博客同一套登录），有效期与次数会叠加。
      </p>

      {/* 当前权益 */}
      <div className="mt-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-700">
        {loading ? (
          <p className="text-gray-500">加载中…</p>
        ) : plan && plan.active ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-0.5 text-xs font-medium text-white">
              {plan.plan}
            </span>
            <span className="text-gray-600 dark:text-gray-300">
              到期：<b>{fmtDateTime(new Date(plan.expiresAt * 1000).toISOString())}</b>
              （剩余 {plan.remainingDays} 天）
            </span>
            <span className="text-gray-600 dark:text-gray-300">
              次数：<b>{plan.quota === 0 ? "不限" : `${plan.used} / ${plan.quota}`}</b>
            </span>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            当前账号没有生效中的权益
            {plan && plan.expiresAt > 0 ? "（上次权益已过期，可兑换新卡密续期）" : ""}
          </p>
        )}
      </div>

      {/* 兑换 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={cardKey}
          onChange={(e) => setCardKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void redeem();
          }}
          placeholder="粘贴卡密，如 sec_basic_XXXXXXXX…"
          className="min-w-[18rem] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="button"
          onClick={() => void redeem()}
          disabled={busy}
          className="btn-grad px-5 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "兑换中…" : "兑换"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}

      {/* 已兑换记录 */}
      {cards.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">
            已兑换的卡密（{cards.length}）
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-xs">
            {cards.map((c) => (
              <li
                key={c.card_key}
                className="flex flex-wrap items-center gap-x-3 rounded border border-gray-200 px-3 py-1.5 dark:border-gray-700"
              >
                <code className="font-mono">{c.card_key}</code>
                <span className="text-gray-500">
                  {c.plan} · {c.days} 天 · {c.quota === 0 ? "不限次" : `${c.quota} 次`}
                </span>
                <span className="ml-auto text-gray-400">
                  {fmtDateTime(new Date(c.redeemed_at * 1000).toISOString())}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
