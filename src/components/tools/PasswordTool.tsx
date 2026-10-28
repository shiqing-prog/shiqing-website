"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

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
    const sets: string[] = [];
    if (useLower) sets.push(CHARS.lower);
    if (useUpper) sets.push(CHARS.upper);
    if (useDigits) sets.push(CHARS.digits);
    if (useSymbols) sets.push(CHARS.symbols);
    if (sets.length === 0) return;
    const pool = sets.join("");
    const len = Math.min(Math.max(length, 4), 128);

    // 拒绝采样：只接受落在「256 的整数倍」区间内的字节，
    // 否则 bytes[i] % pool.length 对靠前的字符有偏置（最长密码池下偏差约 1.5 倍）
    function pickIndex(n: number): number {
      const limit = 256 - (256 % n);
      const buf = new Uint8Array(1);
      for (;;) {
        crypto.getRandomValues(buf);
        if (buf[0] < limit) return buf[0] % n;
      }
    }

    const chars: string[] = [];
    // 每个勾选的字符类先各放一个，保证「大小写+数字+符号」全部有；多余位置随机补
    for (const set of sets) chars.push(set[pickIndex(set.length)]);
    while (chars.length < len) chars.push(pool[pickIndex(pool.length)]);
    // Fisher-Yates 洗牌，避免前几位字符类顺序固定
    for (let i = chars.length - 1; i > 0; i--) {
      const j = pickIndex(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    setPassword(chars.join(""));
    setCopied(false);
  }

  async function copy() {
    const ok = await copyText(password);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
