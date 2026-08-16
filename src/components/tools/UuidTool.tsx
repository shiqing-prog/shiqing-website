"use client";

import { useState } from "react";

function genUuid(): string {
  // crypto.randomUUID 在现代浏览器可用
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // 兜底实现
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function UuidTool() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>(() =>
    Array.from({ length: 5 }, genUuid)
  );
  const [copied, setCopied] = useState("");

  function regenerate() {
    const n = Math.min(Math.max(count || 1, 1), 100);
    setUuids(Array.from({ length: n }, genUuid));
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      /* 静默失败 */
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">UUID 生成器</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        批量生成 UUID v4，点击条目可复制。
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          数量
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            className="input-tool w-20"
          />
        </label>
        <button onClick={regenerate} className="btn-tool">
          重新生成
        </button>
        <button
          onClick={() => copy(uuids.join("\n"), "all")}
          className="btn-tool"
        >
          复制全部
        </button>
        {copied === "all" && (
          <span className="text-sm text-green-600 dark:text-green-400">
            ✅ 已复制
          </span>
        )}
      </div>

      <div className="mt-5 flex max-h-80 flex-col gap-1.5 overflow-y-auto">
        {uuids.map((u, i) => (
          <button
            key={`${u}-${i}`}
            onClick={() => copy(u, String(i))}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-gray-800"
          >
            <span>{u}</span>
            <span className="ml-3 shrink-0 text-xs text-gray-400">
              {copied === String(i) ? "✅ 已复制" : "复制"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
