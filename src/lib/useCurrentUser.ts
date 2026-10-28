"use client";

import { useEffect, useState } from "react";
import type { PublicUser } from "./types";

/**
 * 共享"当前登录用户"hook：
 * - 同一时刻多个组件挂载只发一次 /api/auth/me（共享 in-flight 请求）
 * - 短 TTL 缓存（10s），减少路由切换后的重复请求
 * - 登录/登出等认证变更后调用 refreshCurrentUser() 立即使缓存失效
 */

let cache: { user: PublicUser | null; at: number } | null = null;
/** 最近一次「成功」拿到的用户：请求失败时回退到它，不要把已登录用户误判成未登录 */
let lastGood: PublicUser | null = null;
let inflight: Promise<PublicUser | null> | null = null;

/** 已挂载的 hook 订阅者：refreshCurrentUser() 时通知它们重新拉取
 *  （只清缓存不够——已挂载组件的 effect 不会重跑，登出后导航栏仍会显示已登录） */
const listeners = new Set<() => void>();

/** 请求代数：refresh 后自增，用于丢弃「刷新前发出的在途请求」的结果，
 *  否则旧响应晚到会把刚拉取的新状态覆盖回旧值 */
let generation = 0;

const TTL = 10_000;

type LoadResult = { ok: boolean; user: PublicUser | null };

async function load(): Promise<LoadResult> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    // 非 2xx（500/502/网关错误页）不代表「未登录」，必须和「确实是 null」区分开
    if (!res.ok) return { ok: false, user: null };
    const data = (await res.json()) as { user?: PublicUser | null };
    return { ok: true, user: data.user ?? null };
  } catch {
    return { ok: false, user: null };
  }
}

/** 使缓存失效（登录/登出/资料变更后调用），并通知已挂载组件立即重新请求 */
export function refreshCurrentUser(): void {
  generation++;
  cache = null;
  inflight = null;
  for (const notify of [...listeners]) {
    try {
      notify();
    } catch {
      /* 单个订阅者异常不影响其它组件 */
    }
  }
}

export function useCurrentUser(): PublicUser | null {
  const [user, setUser] = useState<PublicUser | null>(() => {
    if (cache && Date.now() - cache.at < TTL) return cache.user;
    return null;
  });

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      const gen = generation;
      if (cache && Date.now() - cache.at < TTL) {
        if (!cancelled) setUser(cache.user);
        return;
      }
      if (!inflight) {
        const pending = load().then((r) => {
          if (r.ok) {
            lastGood = r.user;
            // 只有「本轮代数」的响应才允许写入缓存
            if (gen === generation) cache = { user: r.user, at: Date.now() };
            return r.user;
          }
          // 失败：不写缓存（否则一次抖动会把「未登录」缓存 10 秒，所有登录态 UI 全灭），
          // 也不清掉已知登录态，回退到上一次成功的结果
          return lastGood;
        });
        inflight = pending;
        // 请求结束后释放 in-flight：原实现在这里不清空，
        // 缓存过期后仍会复用这个早已 resolve 的 promise，永远拿不到新状态
        void pending.finally(() => {
          if (inflight === pending) inflight = null;
        });
      }
      const u = await inflight;
      if (!cancelled && gen === generation) setUser(u);
    };

    void fetchUser();

    const onRefresh = () => {
      void fetchUser();
    };
    listeners.add(onRefresh);
    return () => {
      cancelled = true;
      listeners.delete(onRefresh);
    };
  }, []);

  return user;
}
