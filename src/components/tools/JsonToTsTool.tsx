"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

/** 生成合法且不重复的接口名 */
function uniqueName(base: string, used: Set<string>): string {
  let name = base || "Type";
  let i = 2;
  while (used.has(name)) name = `${base}${i++}`;
  used.add(name);
  return name;
}

/** 把任意 JSON 键名转成 PascalCase 片段，避免出现 `Root内容` 这种非法标识符 */
function pascal(k: string): string {
  const cleaned = k.replace(/[^A-Za-z0-9]+/g, " ").trim();
  if (!cleaned) return "Field";
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function tsType(v: unknown, baseName: string, out: string[], used: Set<string>): string {
  if (v === null) return "null";
  if (Array.isArray(v)) {
    if (v.length === 0) return "unknown[]";
    // 数组元素若也在数组里，名字要跟着往下传，否则会和父接口同名
    return `${tsType(v[0], `${baseName}Item`, out, used)}[]`;
  }
  switch (typeof v) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object": {
      const name = uniqueName(baseName, used);
      const fields = Object.entries(v as Record<string, unknown>).map(([k, val]) => {
        const type = tsType(val, name + pascal(k), out, used);
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
      const sanitized = rootName.trim().replace(/[^A-Za-z0-9_$]/g, "");
      const root = /^[A-Za-z_$]/.test(sanitized) ? sanitized : `Root${sanitized}`;
      const rootType = tsType(parsed, root, out, new Set<string>());
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
