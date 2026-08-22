"use client";

import { useEffect, useState } from "react";

export default function HitokotoQuote() {
  const [quote, setQuote] = useState<{ text: string; from: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://v1.hitokoto.cn/")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.hitokoto) {
          setQuote({ text: d.hitokoto, from: d.from || "" });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!quote) return null;

  return (
    <p className="mx-auto mt-4 max-w-xl text-xs text-gray-400 dark:text-gray-500">
      「{quote.text}」
      {quote.from && <span> —— {quote.from}</span>}
    </p>
  );
}
