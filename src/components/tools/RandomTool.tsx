"use client";

import { useState } from "react";

export default function RandomTool() {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(1);
  const [results, setResults] = useState<number[]>([]);
  const [error, setError] = useState("");

  function generate() {
    setError("");
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      setError("范围无效（最小值不能大于最大值）");
      return;
    }
    const n = Math.min(Math.max(count, 1), 1000);
    const arr: number[] = [];
    for (let i = 0; i < n; i++) {
      arr.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    setResults(arr);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">随机数生成</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        生成指定范围内的随机整数。
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">最小值</span>
          <input
            type="number"
            value={min}
            onChange={(e) => setMin(parseInt(e.target.value) || 0)}
            className="input-tool w-24"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">最大值</span>
          <input
            type="number"
            value={max}
            onChange={(e) => setMax(parseInt(e.target.value) || 0)}
            className="input-tool w-24"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">数量</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            className="input-tool w-20"
          />
        </label>
        <button onClick={generate} className="btn-tool">
          生成
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {results.map((r, i) => (
            <span
              key={i}
              className="rounded-lg bg-blue-50 px-3 py-1.5 font-mono text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
