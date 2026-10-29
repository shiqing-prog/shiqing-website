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
    <p className="mt-5 max-w-2xl border-l border-black/15 pl-3 font-serif text-[13px] italic leading-relaxed text-gray-500 dark:border-white/20 dark:text-gray-400">
      「{quote.text}」
      {quote.from && (
        <span className="not-italic text-gray-400 dark:text-gray-500"> —— {quote.from}</span>
      )}
    </p>
  );
}
