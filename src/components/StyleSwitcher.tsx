"use client";

import { useState } from "react";

const STYLES = [
  { id: "indigo", name: "渐变紫", colors: ["#4f46e5", "#8b5cf6"] },
  { id: "geek", name: "暗色极客", colors: ["#0891b2", "#34d399"] },
  { id: "paper", name: "极简纸感", colors: ["#fafaf9", "#0d9488"] },
  { id: "warm", name: "暖橙活力", colors: ["#f97316", "#ef4444"] },
  { id: "neon", name: "赛博霓虹", colors: ["#22d3ee", "#e879f9"] },
];

const STYLE_IDS = STYLES.map((s) => `style-${s.id}`);

export default function StyleSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("indigo");

  function toggle() {
    // 每次打开时同步 <html> 上的当前主题，保证高亮准确
    const el = document.documentElement;
    const found = STYLE_IDS.find((c) => el.classList.contains(c));
    if (found) setCurrent(found.replace("style-", ""));
    setOpen((o) => !o);
  }

  function apply(id: string) {
    const el = document.documentElement;
    el.classList.remove(...STYLE_IDS);
    el.classList.add(`style-${id}`);
    try {
      localStorage.setItem("style", id);
    } catch {
      /* 隐私模式等场景忽略 */
    }
    setCurrent(id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        title="切换主题风格"
        onClick={toggle}
        className="ml-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm transition hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-800"
      >
        🎨
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => apply(s.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                current === s.id ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                style={{
                  background: `linear-gradient(135deg, ${s.colors[0]}, ${s.colors[1]})`,
                }}
              />
              <span className="text-gray-700 dark:text-gray-200">{s.name}</span>
              {current === s.id && <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
