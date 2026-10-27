"use client";

import { useState } from "react";
import { ToolLayout } from "./ToolLayout";

/** 解析 CSV：支持引号包裹、双引号转义、字段内换行与逗号 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (ch === "\r") {
      // 忽略 CRLF 的 \r
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function csvToJson(text: string): string {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error("CSV 内容为空");
  const header = rows[0];
  const data = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h || `列${i + 1}`] = r[i] ?? "";
    });
    return obj;
  });
  return JSON.stringify(data, null, 2);
}

function rowsToCsv(rows: string[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? "");
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

function jsonToCsv(text: string): string {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("需要 JSON 数组（对象数组）");
  if (parsed.length === 0) throw new Error("数组为空");
  if (typeof parsed[0] !== "object" || parsed[0] === null) {
    throw new Error("数组元素需要是对象");
  }
  const keys: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    for (const k of Object.keys(item)) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  const rows: string[][] = [
    keys,
    ...parsed.map((item) => {
      const obj = item as Record<string, unknown>;
      return keys.map((k) => {
        const v = obj[k];
        if (v === null || v === undefined) return "";
        if (typeof v === "object") return JSON.stringify(v);
        return String(v);
      });
    }),
  ];
  return rowsToCsv(rows);
}

export default function CsvJsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function toJson() {
    setError("");
    try {
      setOutput(csvToJson(input));
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : "转换失败");
    }
  }

  function toCsv() {
    setError("");
    try {
      setOutput(jsonToCsv(input));
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : "转换失败");
    }
  }

  return (
    <ToolLayout
      title="CSV ↔ JSON"
      desc="表格与 JSON 数组互转，支持引号、逗号、换行转义。"
      actions={
        <>
          <button onClick={toJson} className="btn-tool">
            CSV → JSON
          </button>
          <button onClick={toCsv} className="btn-tool">
            JSON → CSV
          </button>
        </>
      }
      output={output}
      error={error}
      value={input}
      onInput={setInput}
      inputPlaceholder="粘贴 CSV（首行为表头）或 JSON 对象数组…"
    />
  );
}
