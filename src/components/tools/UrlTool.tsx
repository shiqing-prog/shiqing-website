"use client";

import { useState } from "react";
import { ToolLayout } from "./ToolLayout";

export default function UrlTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function encode() {
    setError("");
    try {
      setOutput(encodeURIComponent(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "编码失败");
    }
  }

  function decode() {
    setError("");
    try {
      setOutput(decodeURIComponent(input));
    } catch {
      setOutput("");
      setError("解码失败：输入不是合法的 URL 编码");
    }
  }

  return (
    <ToolLayout
      title="URL 编解码"
      desc="URL 编码（%20 形式）与解码互转，支持中文。"
      actions={
        <>
          <button onClick={encode} className="btn-tool">
            编码
          </button>
          <button onClick={decode} className="btn-tool">
            解码
          </button>
        </>
      }
      output={output}
      error={error}
      onInput={setInput}
      inputPlaceholder="输入要编码/解码的文本…"
    />
  );
}
