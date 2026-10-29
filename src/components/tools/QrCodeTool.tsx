"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const SIZES = [256, 384, 512] as const;

const LEVELS = [
  { value: "L", label: "L · 7%" },
  { value: "M", label: "M · 15%" },
  { value: "Q", label: "Q · 25%" },
  { value: "H", label: "H · 30%" },
] as const;

type Level = (typeof LEVELS)[number]["value"];

export default function QrCodeTool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [text, setText] = useState("");
  const [size, setSize] = useState<number>(256);
  const [level, setLevel] = useState<Level>("M");
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!text.trim()) {
      setGenerated(false);
      return;
    }
    setError("");
    try {
      await QRCode.toCanvas(canvas, text, {
        width: size,
        margin: 2,
        errorCorrectionLevel: level,
        color: { dark: "#111827", light: "#ffffff" },
      });
      setGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败：内容可能过长");
      setGenerated(false);
    }
  }, [text, size, level]);

  // 输入变化后自动重绘（防抖 250ms）
  useEffect(() => {
    const timer = setTimeout(() => {
      void generate();
    }, 250);
    return () => clearTimeout(timer);
  }, [generate]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !generated) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qrcode.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  return (
    <div className="rounded-[3px] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">二维码生成</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        文本、链接转二维码，纯本地绘制不上传，可下载 PNG。
      </p>

      <label className="mt-5 block text-sm font-medium">内容</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="例如 https://shiqing.site"
        rows={4}
        className="input-tool mt-2 w-full resize-y font-mono text-sm"
      />

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block text-gray-500 dark:text-gray-400">尺寸</span>
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="input-tool px-3 py-1.5 text-sm"
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s} × {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-500 dark:text-gray-400">纠错级别</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            className="input-tool px-3 py-1.5 text-sm"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={download}
          disabled={!generated}
          className="btn-tool disabled:cursor-not-allowed disabled:opacity-50"
        >
          下载 PNG
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-6 flex min-h-48 items-center justify-center rounded-[2px] bg-gray-50 p-6 dark:bg-gray-950">
        <canvas
          ref={canvasRef}
          className={generated ? "rounded-[2px]" : "hidden"}
        />
        {!generated && !error && (
          <p className="text-sm text-gray-400">二维码会显示在这里</p>
        )}
      </div>
    </div>
  );
}
