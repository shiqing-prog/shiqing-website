"use client";

import { useEffect, useState } from "react";
import type { Announcement } from "@/lib/types";

/** 首页公告条：可关闭（localStorage 记住已关闭的公告 id） */
export default function AnnouncementBar({ items }: { items: Announcement[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const raw = localStorage.getItem("announcement:dismissed");
        if (raw) setDismissed(JSON.parse(raw) as string[]);
      } catch {
        /* 忽略 */
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (!ready || visible.length === 0) return null;
  const a = visible[0];

  function dismiss() {
    const next = [...dismissed, a.id].slice(-50);
    setDismissed(next);
    try {
      localStorage.setItem("announcement:dismissed", JSON.stringify(next));
    } catch {
      /* 忽略 */
    }
  }

  return (
    <div className="kratos-card mb-6 flex items-start gap-3 border-l-4 border-l-amber-400 p-4">
      <span className="text-lg leading-none">📢</span>
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{a.content}</p>
        <p className="mt-1 text-xs text-gray-400">
          站点公告 · {a.created_at.slice(0, 10)}
          {a.expires_at && ` · ${a.expires_at.slice(0, 10)} 到期`}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        title="不再显示该公告"
        className="shrink-0 rounded px-1.5 text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200"
      >
        ✕
      </button>
    </div>
  );
}
