"use client";

import { useState } from "react";

export default function RadixTool() {
  const [input, setInput] = useState("");
  const [fromRadix, setFromRadix] = useState(10);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, string> | null>(null);

  function convert() {
    setError("");
    const value = input.trim();
    if (!value) return;
    const num = parseInt(value, fromRadix);
    if (isNaN(num)) {
      setError("无法解析输入，请检查进制与数字");
      setResult(null);
      return;
    }
    setResult({
      "二进制 (2)": num.toString(2),
      "八进制 (8)": num.toString(8),
      "十进制 (10)": num.toString(10),
      "十六进制 (16)": num.toString(16).toUpperCase(),
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">进制转换</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        二进制 / 八进制 / 十进制 / 十六进制互转。
      </p>

      <div className="mt-5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入数字"
          className="input-tool flex-1 font-mono"
        />
        <select
          value={fromRadix}
          onChange={(e) => setFromRadix(parseInt(e.target.value))}
          className="btn-tool"
        >
          <option value={2}>二进制</option>
          <option value={8}>八进制</option>
          <option value={10}>十进制</option>
          <option value={16}>十六进制</option>
        </select>
        <button onClick={convert} className="btn-tool">
          转换
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 flex flex-col gap-2">
          {Object.entries(result).map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700"
            >
              <span className="text-gray-500">{label}</span>
              <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
