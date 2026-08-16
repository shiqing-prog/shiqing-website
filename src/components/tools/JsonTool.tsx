"use client";

import { useState } from "react";
import { ToolLayout } from "./ToolLayout";

export default function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function format(indent: number) {
    setError("");
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
    } catch (err) {
      setOutput("");
      setError(
        `JSON 解析失败：${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  function minify() {
    setError("");
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch (err) {
      setOutput("");
      setError(
        `JSON 解析失败：${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return (
    <ToolLayout
      title="JSON 格式化"
      desc="粘贴 JSON 文本，一键格式化、压缩或校验。"
      actions={
        <>
          <button onClick={() => format(2)} className="btn-tool">
            格式化（2 空格）
          </button>
          <button onClick={() => format(4)} className="btn-tool">
            格式化（4 空格）
          </button>
          <button onClick={minify} className="btn-tool">
            压缩
          </button>
        </>
      }
      output={output}
      error={error}
      onInput={setInput}
      inputPlaceholder='{"name":"你的名字","skills":["Next.js","React"]}'
    />
  );
}
