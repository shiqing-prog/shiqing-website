"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function NotificationBell() {
  const user = useCurrentUser();
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // unread 初始即为 0，无需在 effect 中同步置零
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications");
        // 401 等非 2xx：视为未登录/接口异常，不误判为已登录
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setUnread(data.unread ?? 0);
      } catch {
        if (!cancelled) setUnread(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  if (!user) return null;

  return (
    <Link
      href="/notifications"
      title="通知"
      className="relative ml-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm transition hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-800"
    >
      🔔
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
