"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  if (dark === null) return null;

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("light", !next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* 忽略 */
    }
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "切换到亮色模式" : "切换到暗色模式"}
      className="ml-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm transition hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-800"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
