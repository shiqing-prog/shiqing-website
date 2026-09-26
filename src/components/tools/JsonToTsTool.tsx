"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

function tsType(v: unknown, name: string, out: string[]): string {
  if (v === null) return "null";
  if (Array.isArray(v)) {
    if (v.length === 0) return "unknown[]";
    return `${tsType(v[0], name, out)}[]`;
  }
  switch (typeof v) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object": {
      const fields = Object.entries(v as Record<string, unknown>).map(([k, val]) => {
        const isObj = val !== null && typeof val === "object" && !Array.isArray(val);
        const type = isObj ? tsType(val, name + k.charAt(0).toUpperCase() + k.slice(1), out) : tsType(val, name, out);
        const safeKey = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
        return `  ${safeKey}: ${type};`;
      });
      out.push(`export interface ${name} {\n${fields.join("\n")}\n}`);
      return name;
    }
    default:
      return "unknown";
  }
}

export default function JsonToTsTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [rootName, setRootName] = useState("Root");

  function convert() {
    setError("");
    setOutput("");
    try {
      const parsed = JSON.parse(input);
      const out: string[] = [];
      const root = rootName.trim() || "Root";
      const rootType = tsType(parsed, root, out);
      const head = rootType === root ? "" : `// 根类型：${rootType}\n`;
      setOutput(head + out.join("\n\n"));
    } catch (err) {
      setError(`JSON 解析失败：${err instanceof Error ? err.message : "格式错误"}`);
    }
  }

  return (
    <div className="kratos-card p-6">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">根接口名</span>
        <input className={inputCls} value={rootName} onChange={(e) => setRootName(e.target.value)} />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium">JSON 示例</span>
        <textarea
          className={inputCls + " font-mono text-xs"}
          rows={7}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'{"id":1,"name":"a","tags":["x"],"meta":{"ok":true}}'}
        />
      </label>
      <button
        type="button"
        onClick={convert}
        className="mt-3 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white"
      >
        生成 TypeScript 接口
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {output && (
        <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">
          {output}
        </pre>
      )}
    </div>
  );
}
