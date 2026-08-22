"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (!cancelled) {
          setLoggedIn(true);
          setUnread(data.unread ?? 0);
        }
      } catch {
        if (!cancelled) setLoggedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!loggedIn) return null;

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
