"use client";

import { useState } from "react";

export default function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  function test() {
    setError("");
    setMatches([]);
    setCount(0);
    try {
      if (!pattern) {
        setError("请先输入正则表达式");
        return;
      }
      const re = new RegExp(pattern, flags);
      const found: string[] = [];
      if (re.global) {
        // 用 exec 循环而不是 String.match：避免空 pattern 匹配出一堆空串
        const g = new RegExp(re.source, re.flags);
        let m: RegExpExecArray | null;
        while ((m = g.exec(text)) !== null) {
          if (m[0] === "") {
            // 零宽匹配不前进会死循环
            g.lastIndex += 1;
            continue;
          }
          found.push(m[0]);
          if (found.length >= 500) break;
        }
      } else {
        // 不带 g 时只取第一处的完整匹配（捕获组不算匹配项）
        const m = re.exec(text);
        if (m) found.push(m[0]);
      }
      setMatches(found);
      setCount(found.length);
    } catch (err) {
      setError(`正则无效：${err instanceof Error ? err.message : String(err)}`);
      setMatches([]);
      setCount(0);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">正则测试</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        输入正则表达式与测试文本，查看匹配结果。
      </p>

      <div className="mt-5 flex gap-2">
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="正则表达式，如 \d+"
          className="input-tool flex-1 font-mono"
        />
        <input
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          placeholder="flags"
          className="input-tool w-24 font-mono"
        />
        <button onClick={test} className="btn-tool">
          测试
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="在此输入测试文本…"
        rows={6}
        className="input-tool mt-3 w-full resize-y font-mono text-sm"
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {count > 0 && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          共匹配 <b className="text-blue-600">{count}</b> 处
        </p>
      )}

      {matches.length > 0 && (
        <ul className="mt-3 flex max-h-48 flex-col gap-1 overflow-y-auto">
          {matches.map((m, i) => (
            <li
              key={i}
              className="rounded bg-blue-50 px-3 py-1 font-mono text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              #{i + 1} 「{m}」
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
