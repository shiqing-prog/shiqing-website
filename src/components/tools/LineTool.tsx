"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function LineTool() {
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [msg, setMsg] = useState("");

  const lines = () => text.split(/\r?\n/);

  function run(fn: (ls: string[]) => string[], label: string) {
    setOutput(fn(lines()).join("\n"));
    setMsg(`✅ ${label}`);
  }

  return (
    <div className="kratos-card p-6">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">输入文本（每行一条）</span>
        <textarea
          className={inputCls}
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"banana\napple\nbanana\n\ncherry"}
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["去重（保留顺序）", (ls: string[]) => ls.filter((v, i) => ls.indexOf(v) === i)],
            ["去空行", (ls: string[]) => ls.filter((l) => l.trim() !== "")],
            ["升序排序", (ls: string[]) => [...ls].sort((a, b) => a.localeCompare(b))],
            ["降序排序", (ls: string[]) => [...ls].sort((a, b) => b.localeCompare(a))],
            ["反转顺序", (ls: string[]) => [...ls].reverse()],
            ["去重 + 排序", (ls: string[]) => [...new Set(ls)].sort((a, b) => a.localeCompare(b))],
            ["trim 首尾空格", (ls: string[]) => ls.map((l) => l.trim())],
          ] as [string, (ls: string[]) => string[]][]
        ).map(([label, fn]) => (
          <button
            key={label}
            type="button"
            onClick={() => run(fn, label)}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1 flex items-center justify-between font-medium">
          <span>结果</span>
          <span className="text-xs font-normal text-gray-400">
            {output ? `${output.split("\n").length} 行` : ""}
          </span>
        </span>
        <textarea className={inputCls} rows={8} value={output} readOnly />
      </label>
      {msg && <p className="mt-2 text-xs text-green-600 dark:text-green-400">{msg}</p>}
    </div>
  );
}
