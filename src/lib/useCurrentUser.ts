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
let inflight: Promise<PublicUser | null> | null = null;

/** 已挂载的 hook 订阅者：refreshCurrentUser() 时通知它们重新拉取
 *  （只清缓存不够——已挂载组件的 effect 不会重跑，登出后导航栏仍会显示已登录） */
const listeners = new Set<() => void>();

const TTL = 10_000;

async function load(): Promise<PublicUser | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: PublicUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** 使缓存失效（登录/登出/资料变更后调用），并通知已挂载组件立即重新请求 */
export function refreshCurrentUser(): void {
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
      if (cache && Date.now() - cache.at < TTL) {
        if (!cancelled) setUser(cache.user);
        return;
      }
      if (!inflight) {
        inflight = load().then((u) => {
          cache = { user: u, at: Date.now() };
          return u;
        });
      }
      const u = await inflight;
      if (!cancelled) setUser(u);
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
