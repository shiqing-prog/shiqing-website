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
    try {
      // 支持完整 Data URL 或纯 base64
      const url = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
      // 简单校验：必须能解出字节
      const base64 = url.split(",")[1] ?? "";
      const bin = atob(base64);
      if (!bin.length) throw new Error("空数据");
      setDataUrl(url);
    } catch {
      setError("不是合法的 Base64 图片数据");
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
