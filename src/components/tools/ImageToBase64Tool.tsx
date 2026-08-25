"use client";

import { useRef, useState } from "react";

export default function ImageToBase64Tool() {
  const [dataUrl, setDataUrl] = useState("");
  const [size, setSize] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(file: File) {
    setError("");
    setCopied(false);
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setDataUrl(result);
      setSize(result.length);
    };
    reader.onerror = () => setError("读取文件失败");
    reader.readAsDataURL(file);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 忽略 */
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">图片转 Base64</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        本地转换为 Data URL，不上传服务器。
      </p>

      <div className="mt-5">
        <label className="cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300">
          🖼️ 选择图片
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {dataUrl && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt="预览"
            className="max-h-40 rounded-lg border border-gray-200 object-contain dark:border-gray-700"
          />
          <p className="mt-2 text-xs text-gray-500">
            Base64 长度：{size.toLocaleString()} 字符
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={copy} className="btn-tool">
              {copied ? "✅ 已复制" : "复制 Base64"}
            </button>
            <button
              onClick={() => {
                setDataUrl("");
                setSize(0);
              }}
              className="btn-tool"
            >
              清除
            </button>
          </div>
          <textarea
            readOnly
            value={dataUrl}
            rows={5}
            className="input-tool mt-3 w-full resize-y font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}
