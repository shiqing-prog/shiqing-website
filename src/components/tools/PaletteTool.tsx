"use client";

import { useMemo, useState } from "react";
import { copyText } from "@/lib/clipboard";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}
/** 与白色/黑色混合，ratio=0 原色，1 全白/全黑 */
function mix(hex: string, target: [number, number, number], ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb[0] + (target[0] - rgb[0]) * ratio,
    rgb[1] + (target[1] - rgb[1]) * ratio,
    rgb[2] + (target[2] - rgb[2]) * ratio
  );
}

export default function PaletteTool() {
  const [base, setBase] = useState("#4f46e5");
  const [copied, setCopied] = useState("");

  const shades = useMemo(() => {
    const steps = [0.9, 0.7, 0.5, 0.3, 0.15];
    const light = steps.map((r) => mix(base, [255, 255, 255], r));
    const dark = steps.map((r) => mix(base, [0, 0, 0], r)).reverse();
    return [...light, base, ...dark];
  }, [base]);

  async function copy(hex: string) {
    const ok = await copyText(hex);
    if (ok) {
      setCopied(hex);
      setTimeout(() => setCopied(""), 1200);
    }
  }

  return (
    <div className="kratos-card p-6">
      <label className="flex items-center gap-3 text-sm">
        <span className="font-medium">基色</span>
        <input
          type="color"
          value={hexToRgb(base) ? base : "#4f46e5"}
          onChange={(e) => setBase(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
        />
        <input className={inputCls + " w-40"} value={base} onChange={(e) => setBase(e.target.value)} />
      </label>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-11">
        {shades.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => void copy(hex)}
            title={`点击复制 ${hex}`}
            className="flex h-16 items-end justify-center rounded-lg border border-black/10 p-1 text-[10px] font-medium transition hover:scale-105 dark:border-white/10"
            style={{ background: hex, color: hexToRgb(hex) && (hexToRgb(hex)![0] + hexToRgb(hex)![1] + hexToRgb(hex)![2]) / 3 > 150 ? "#333" : "#fff" }}
          >
            {hex.replace("#", "")}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        点击色块复制色值{copied && ` · 已复制 ${copied}`}；自动生成 11 级明暗梯度
      </p>
    </div>
  );
}
