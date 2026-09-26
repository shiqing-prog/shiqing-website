"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** 组合快捷键：g 开头（Go to） */
const GO_MAP: Record<string, { href: string; label: string }> = {
  h: { href: "/", label: "首页" },
  f: { href: "/files", label: "文件库" },
  g: { href: "/games", label: "游戏厅" },
  t: { href: "/tools", label: "工具箱" },
  c: { href: "/changelog", label: "更新日志" },
  s: { href: "/stats", label: "站点统计" },
  p: { href: "/psych", label: "心理测评" },
  a: { href: "/tags", label: "标签云" },
  n: { href: "/bbs/new", label: "发新帖" },
  m: { href: "/messages", label: "私信" },
};

/** 判断焦点是否在输入控件里 */
function isTyping(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    node.isContentEditable === true
  );
}

/** 全站键盘快捷键：/ 搜索、g+字母 跳转、? 帮助、Esc 关闭 */
export default function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingGo = useRef(false);
  const goTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Esc 关闭帮助面板
      if (e.key === "Escape") {
        setHelpOpen(false);
        pendingGo.current = false;
        return;
      }
      // 输入中不劫持按键（Shift+/ 即 ? 也仅在非输入时生效）
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      // g 序列
      if (pendingGo.current) {
        pendingGo.current = false;
        if (goTimer.current) clearTimeout(goTimer.current);
        const target = GO_MAP[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          router.push(target.href);
        }
        return;
      }
      if (e.key === "g") {
        pendingGo.current = true;
        goTimer.current = setTimeout(() => {
          pendingGo.current = false;
        }, 1200);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>("[data-search-input]");
        if (input) input.focus();
        else router.push("/bbs/search");
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (goTimer.current) clearTimeout(goTimer.current);
    };
  }, [router]);

  if (!helpOpen) return null;

  return (
    <div
      role="presentation"
      onClick={() => setHelpOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        role="dialog"
        aria-label="键盘快捷键"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900"
      >
        <h2 className="text-base font-bold">⌨️ 键盘快捷键</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <li className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">聚焦搜索框</span>
            <kbd className="rounded border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-700">
              /
            </kbd>
          </li>
          <li className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">显示 / 隐藏本帮助</span>
            <kbd className="rounded border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-700">
              ?
            </kbd>
          </li>
          <li className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">关闭弹层 / 灯箱</span>
            <kbd className="rounded border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-700">
              Esc
            </kbd>
          </li>
          <li className="pt-1 text-xs text-gray-400">
            先按 <b>g</b> 再按字母跳转：
          </li>
          {Object.entries(GO_MAP).map(([key, v]) => (
            <li key={key} className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">{v.label}</span>
              <kbd className="rounded border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-700">
                g {key}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setHelpOpen(false)}
          className="btn-grad mt-5 w-full py-2 text-sm"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
