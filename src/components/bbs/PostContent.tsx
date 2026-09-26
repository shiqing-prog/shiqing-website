"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/toc";

/**
 * 帖子正文：
 * - 渲染 Markdown HTML（html 已在服务端转义）
 * - 为代码块追加「复制」按钮
 * - 点击正文图片放大查看（灯箱）
 * - 有 3 个以上标题时展示目录
 */
export default function PostContent({
  html,
  toc = [],
}: {
  html: string;
  toc?: TocItem[];
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    // 代码块加复制按钮
    const cleanups: (() => void)[] = [];
    root.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".md-copy-btn")) return;
      pre.classList.add("relative");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "复制";
      btn.className =
        "md-copy-btn absolute right-2 top-2 rounded border border-gray-300/60 bg-white/80 px-2 py-0.5 text-[11px] text-gray-600 opacity-0 transition hover:text-blue-600 dark:border-gray-600 dark:bg-gray-900/80 dark:text-gray-300";
      pre.appendChild(btn);
      const show = () => (btn.style.opacity = "1");
      const hide = () => (btn.style.opacity = "0");
      pre.addEventListener("mouseenter", show);
      pre.addEventListener("mouseleave", hide);
      const onClick = () => {
        const code = pre.querySelector("code");
        const text = (code ?? pre).textContent ?? "";
        void navigator.clipboard?.writeText(text).then(
          () => {
            btn.textContent = "已复制";
            setTimeout(() => (btn.textContent = "复制"), 1500);
          },
          () => {
            btn.textContent = "复制失败";
            setTimeout(() => (btn.textContent = "复制"), 1500);
          }
        );
      };
      btn.addEventListener("click", onClick);
      cleanups.push(() => {
        pre.removeEventListener("mouseenter", show);
        pre.removeEventListener("mouseleave", hide);
        btn.removeEventListener("click", onClick);
        btn.remove();
      });
    });

    // 图片点击放大
    root.querySelectorAll("img").forEach((img) => {
      img.style.cursor = "zoom-in";
      const onClick = () => setZoom(img.getAttribute("src"));
      img.addEventListener("click", onClick);
      cleanups.push(() => img.removeEventListener("click", onClick));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [html]);

  // Esc 关闭灯箱
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  return (
    <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
      {toc.length >= 3 && (
        <details className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          <summary className="cursor-pointer font-medium text-gray-600 dark:text-gray-300">
            📑 目录（{toc.length} 节）
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {toc.map((h) => (
              <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                <a
                  href={`#${h.id}`}
                  className="text-gray-600 hover:text-blue-600 hover:underline dark:text-gray-300 dark:hover:text-blue-400"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div
        ref={bodyRef}
        className="prose-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {zoom && (
        <div
          role="presentation"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom}
            alt="放大预览"
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
