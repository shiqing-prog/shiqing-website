"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox({
  initial = "",
  compact = false,
}: {
  initial?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/bbs/search?q=${encodeURIComponent(query)}` : "/bbs/search");
  }

  return (
    <form onSubmit={submit} className={compact ? "w-full" : "w-full max-w-md"}>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索帖子…"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          搜索
        </button>
      </div>
    </form>
  );
}
