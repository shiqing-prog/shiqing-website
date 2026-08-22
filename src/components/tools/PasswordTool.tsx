"use client";

import { useState } from "react";

const CHARS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{};:,.<>?",
};

export default function PasswordTool() {
  const [length, setLength] = useState(16);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  function generate() {
    let pool = "";
    if (useLower) pool += CHARS.lower;
    if (useUpper) pool += CHARS.upper;
    if (useDigits) pool += CHARS.digits;
    if (useSymbols) pool += CHARS.symbols;
    if (!pool) return;
    const len = Math.min(Math.max(length, 4), 128);
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < len; i++) {
      out += pool[bytes[i] % pool.length];
    }
    setPassword(out);
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 忽略 */
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">密码生成器</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        随机生成强密码，字符集可选。
      </p>

      <div className="mt-5 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          长度
          <input
            type="number"
            min={4}
            max={128}
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value) || 16)}
            className="input-tool w-20"
          />
        </label>
        <div className="flex flex-wrap gap-3 text-sm">
          {(
            [
              ["小写字母", useLower, setUseLower],
              ["大写字母", useUpper, setUseUpper],
              ["数字", useDigits, setUseDigits],
              ["符号", useSymbols, setUseSymbols],
            ] as [string, boolean, (v: boolean) => void][]
          ).map(([label, val, set]) => (
            <label key={label} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => set(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={generate} className="btn-tool">
          生成
        </button>
        {password && (
          <button onClick={copy} className="btn-tool">
            {copied ? "✅ 已复制" : "复制"}
          </button>
        )}
      </div>

      {password && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm break-all dark:border-gray-700 dark:bg-gray-900">
          {password}
        </div>
      )}
    </div>
  );
}
