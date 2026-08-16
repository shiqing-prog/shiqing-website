"use client";

import { useState } from "react";

export default function ColorTool() {
  const [hex, setHex] = useState("#3498db");
  const [hexMsg, setHexMsg] = useState("");
  const [rgb, setRgb] = useState("52, 152, 219");
  const [rgbMsg, setRgbMsg] = useState("");
  const [copied, setCopied] = useState(false);

  function hexToRgb() {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
    if (!m) {
      setHexMsg("格式无效，请输入 #RRGGBB（如 #3498db）");
      return;
    }
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    setRgb(`${r}, ${g}, ${b}`);
    setHexMsg(`rgb(${r}, ${g}, ${b})`);
  }

  function rgbToHex() {
    const parts = rgb
      .split(/[,，\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n));
    if (parts.length !== 3 || parts.some((n) => n < 0 || n > 255)) {
      setRgbMsg("格式无效，请输入 0-255 的三个数字（如 52, 152, 219）");
      return;
    }
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    const h = `#${parts.map(toHex).join("")}`.toUpperCase();
    setHex(h);
    setRgbMsg(h);
  }

  const currentColor = /^#?[0-9a-fA-F]{6}$/.test(hex.trim())
    ? (hex.trim().startsWith("#") ? hex.trim() : `#${hex.trim()}`)
    : "#cccccc";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">颜色转换</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        HEX 与 RGB 互转，点击色块可复制颜色值。
      </p>

      {/* 预览 */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => copy(currentColor)}
          title="点击复制"
          className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 shadow-inner transition hover:scale-105 dark:border-gray-700"
          style={{ backgroundColor: currentColor }}
        />
        <div>
          <div className="font-mono text-sm">{currentColor}</div>
          <div className="mt-0.5 text-xs text-gray-500">
            {copied ? "✅ 已复制" : "点击色块复制"}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {/* HEX → RGB */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            HEX 颜色
          </label>
          <div className="flex gap-2">
            <input
              value={hex}
              onChange={(e) => {
                setHex(e.target.value);
                setHexMsg("");
              }}
              className="input-tool flex-1 font-mono"
              placeholder="#3498db"
            />
            <button onClick={hexToRgb} className="btn-tool">
              → RGB
            </button>
          </div>
          {hexMsg && (
            <p className="mt-2 font-mono text-sm text-gray-600 dark:text-gray-300">
              {hexMsg}
            </p>
          )}
        </div>

        {/* RGB → HEX */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            RGB 颜色
          </label>
          <div className="flex gap-2">
            <input
              value={rgb}
              onChange={(e) => {
                setRgb(e.target.value);
                setRgbMsg("");
              }}
              className="input-tool flex-1 font-mono"
              placeholder="52, 152, 219"
            />
            <button onClick={rgbToHex} className="btn-tool">
              → HEX
            </button>
          </div>
          {rgbMsg && (
            <p className="mt-2 font-mono text-sm text-gray-600 dark:text-gray-300">
              {rgbMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
