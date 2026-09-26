"use client";

import { useState } from "react";

const inputCls =
  "w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

/** #RRGGBB -> [r,g,b]，非法返回 null */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** 相对亮度（WCAG 2.1） */
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** [r,g,b] -> #rrggbb（供原生取色器使用，必须是 6 位十六进制） */
function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** 建议：前景色换成黑或白哪个对比更高 */
function suggest(fg: string, bg: [number, number, number]): string {
  const white = contrast([255, 255, 255], bg);
  const black = contrast([0, 0, 0], bg);
  const cur = hexToRgb(fg);
  const curRatio = cur ? contrast(cur, bg) : 0;
  if (curRatio >= 4.5) return "当前配色已满足 AA 正文要求";
  return white >= black
    ? "建议把前景色改为 #FFFFFF（白色对比更高）"
    : "建议把前景色改为 #000000（黑色对比更高）";
}

export default function ContrastTool() {
  const [fg, setFg] = useState("#4f46e5");
  const [bg, setBg] = useState("#ffffff");

  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  const ratio = fgRgb && bgRgb ? contrast(fgRgb, bgRgb) : null;

  const checks = ratio
    ? [
        { label: "正文（AA，≥4.5）", pass: ratio >= 4.5 },
        { label: "正文（AAA，≥7）", pass: ratio >= 7 },
        { label: "大字（AA，≥3）", pass: ratio >= 3 },
        { label: "大字（AAA，≥4.5）", pass: ratio >= 4.5 },
        { label: "界面元素（AA，≥3）", pass: ratio >= 3 },
      ]
    : [];

  return (
    <div className="kratos-card p-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium">前景色（文字）</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={fgRgb ? rgbToHex(fgRgb) : "#000000"}
              onChange={(e) => setFg(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
            />
            <input className={inputCls} value={fg} onChange={(e) => setFg(e.target.value)} />
          </div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">背景色</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bgRgb ? rgbToHex(bgRgb) : "#ffffff"}
              onChange={(e) => setBg(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
            />
            <input className={inputCls} value={bg} onChange={(e) => setBg(e.target.value)} />
          </div>
        </label>
        <button
          type="button"
          onClick={() => {
            setFg(bg);
            setBg(fg);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
        >
          ⇄ 交换
        </button>
      </div>

      {(!fgRgb || !bgRgb) && (
        <p className="mt-4 text-sm text-red-600">
          颜色格式无效，请输入 #RRGGBB 或 #RGB（如 #4f46e5）
        </p>
      )}

      {fgRgb && bgRgb && ratio !== null && (
        <>
          {/* 预览 */}
          <div
            className="mt-5 rounded-lg border border-gray-200 p-5 dark:border-gray-700"
            style={{ backgroundColor: bg, color: fg }}
          >
            <p className="text-lg font-bold">大号标题预览 Aa</p>
            <p className="mt-1 text-sm">
              正文预览：一个无人知晓的小站点，技术笔记、生活杂谈、资源共享。
            </p>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold">{ratio.toFixed(2)}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              对比度（WCAG 要求 1 ~ 21，越大越清晰）
            </span>
          </div>

          <ul className="mt-4 flex flex-col gap-1.5 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <span className={c.pass ? "text-green-600" : "text-red-500"}>
                  {c.pass ? "✅" : "❌"}
                </span>
                <span className="text-gray-600 dark:text-gray-300">{c.label}</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            💡 {suggest(fg, bgRgb)}
          </p>
        </>
      )}
    </div>
  );
}
