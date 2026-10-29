"use client";

import { useEffect, useState } from "react";

/** 顶部阅读进度条：随页面滚动显示阅读百分比 */
export default function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? Math.min((el.scrollTop / total) * 100, 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pct <= 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-60 h-[3px] bg-transparent">
      <div
        className="h-full bg-blue-600 transition-[width] duration-150 dark:bg-blue-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
