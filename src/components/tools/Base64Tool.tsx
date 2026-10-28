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
      // 归一化：去空白/换行（MIME Base64 会折行），base64url 的 -_ 换回 +/，补齐 =
      const cleaned = input
        .replace(/\s+/g, "")
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .replace(/=+$/, "");
      if (!cleaned || !/^[A-Za-z0-9+/]+$/.test(cleaned)) throw new Error("bad base64");
      const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
      const bin = atob(padded);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      try {
        // fatal: true — 非法 UTF-8 直接抛错，而不是悄悄塞一堆 U+FFFD
        setOutput(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      } catch {
        const hex = [...bytes.slice(0, 64)]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        setOutput(
          `（二进制数据，不是文本：共 ${bytes.length} 字节，前 64 字节十六进制预览）\n${hex}${bytes.length > 64 ? " …" : ""}`,
        );
      }
    } catch {
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
      value={input}
      onInput={setInput}
      inputPlaceholder="输入要编码/解码的文本…"
    />
  );
}
