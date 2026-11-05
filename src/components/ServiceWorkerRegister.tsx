"use client";

import { useEffect } from "react";

/** 注册离线兜底 Service Worker（只做导航失败回退，不缓存内容） */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // 开发环境注册 SW 会缓存 /offline 与干扰 HMR，只在生产注册
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* 注册失败不影响正常浏览 */
    });
  }, []);
  return null;
}
