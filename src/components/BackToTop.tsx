"use client";

import { useEffect, useState } from "react";

/** 回到顶部：滚动超过 600px 后显示（右下角，移动端友好） */
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      aria-label="回到顶部"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-lg backdrop-blur transition hover:text-blue-600 lg:bottom-6 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300"
    >
      ↑
    </button>
  );
}
