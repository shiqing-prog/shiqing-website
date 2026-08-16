"use client";

import { useState } from "react";
import { ToolLayout } from "./ToolLayout";

export default function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function encode() {
    setError("");
    try {
      // 支持中文：先转 UTF-8 字节再 Base64
      const bytes = new TextEncoder().encode(input);
      let bin = "";
      bytes.forEach((b) => (bin += String.fromCharCode(b)));
      setOutput(btoa(bin));
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "编码失败");
    }
  }

  function decode() {
    setError("");
    try {
      const bin = atob(input.trim());
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      setOutput(new TextDecoder().decode(bytes));
    } catch (err) {
      setOutput("");
      setError("解码失败：输入不是合法的 Base64 字符串");
    }
  }

  return (
    <ToolLayout
      title="Base64 编解码"
      desc="文本与 Base64 互转，支持中文（UTF-8）。"
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
