"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 状态页自动刷新：定时触发服务端重新渲染（数据本身在服务端有 15s 缓存） */
export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return <span className="text-xs text-gray-400">每 {seconds} 秒自动刷新</span>;
}
