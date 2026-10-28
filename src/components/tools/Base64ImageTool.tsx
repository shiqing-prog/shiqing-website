"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function Base64ImageTool() {
  const [input, setInput] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");

  function decode() {
    setError("");
    setDataUrl("");
    const raw = input.trim();
    if (!raw) return;
    // 8 MB 的 base64 大约 6 MB 原图，再大浏览器渲染容易卡死
    if (raw.length > 8 * 1024 * 1024) {
      setError("数据超过 8 MB，浏览器渲染可能很卡，建议先压缩图片再试");
      return;
    }
    try {
      let base64 = raw;
      let declared = "";
      if (raw.startsWith("data:")) {
        const comma = raw.indexOf(",");
        if (comma < 0) throw new Error("bad data url");
        const meta = raw.slice(5, comma); // 如 image/png;base64
        declared = meta.split(";")[0] || "";
        base64 = raw.slice(comma + 1);
      }
      base64 = base64
        .replace(/\s+/g, "")
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      base64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const bin = atob(base64);
      if (!bin.length) throw new Error("空数据");

      // 按魔数判断真实格式，纯 base64 不再一律当成 PNG
      const head = bin.slice(0, 12);
      const bc = (i: number) => head.charCodeAt(i);
      let mime = declared;
      if (bc(0) === 0x89 && head.slice(1, 4) === "PNG") mime = "image/png";
      else if (bc(0) === 0xff && bc(1) === 0xd8) mime = "image/jpeg";
      else if (head.slice(0, 4) === "GIF8") mime = "image/gif";
      else if (head.slice(0, 4) === "RIFF" && head.slice(8, 12) === "WEBP") mime = "image/webp";
      else if (head.slice(0, 2) === "BM") mime = "image/bmp";
      if (!mime) throw new Error("unknown image type");

      setDataUrl(`data:${mime};base64,${base64}`);
    } catch {
      setError("不是合法的 Base64 图片数据（支持 PNG / JPEG / GIF / WebP / BMP）");
    }
  }

  return (
    <div className="kratos-card p-6">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">
          Base64 数据（可带 data:image/... 前缀）
        </span>
        <textarea
          className={inputCls + " font-mono text-xs"}
          rows={6}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="data:image/png;base64,iVBORw0KGgo..."
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={decode}
          className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white"
        >
          解码预览
        </button>
        <button
          type="button"
          onClick={() => {
            setInput("");
            setDataUrl("");
            setError("");
          }}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
        >
          清空
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {dataUrl && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt="解码结果"
            className="max-h-72 rounded-lg border border-gray-200 dark:border-gray-700"
          />
          <a
            href={dataUrl}
            download="decoded-image"
            className="mt-3 inline-block rounded-lg border border-blue-300 px-3 py-1.5 text-xs text-blue-600 dark:border-blue-800 dark:text-blue-400"
          >
            ⬇ 下载图片
          </a>
        </div>
      )}
    </div>
  );
}
