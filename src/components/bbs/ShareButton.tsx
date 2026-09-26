"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function share() {
    const ok = await copyText(window.location.href);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      onClick={share}
      title="复制链接分享"
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      {copied ? "✅ 已复制" : "🔗 分享"}
    </button>
  );
}
