"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Notification } from "@/lib/types";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch {
      /* 忽略 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setNotifications(data.notifications ?? []);
      } catch {
        /* 忽略 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications(notifications.map((n) => ({ ...n, is_read: 1 })));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="border-l-4 border-blue-600 pl-3 text-2xl font-bold">
          通知中心
        </h1>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={markAllRead}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
          >
            全部已读
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-8 text-gray-500">加载中…</p>
      ) : notifications.length === 0 ? (
        <div className="kratos-card mt-6 p-10 text-center text-gray-500">
          暂无通知
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`kratos-card p-4 ${n.is_read ? "opacity-60" : ""}`}
            >
              <Link href={`/bbs/post/${n.post_id}`} className="block">
                <p className="text-sm">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {n.actor_nickname}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    {" "}
                    回复了你的帖子：「{n.content}」
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-400">{fmtTime(n.created_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
