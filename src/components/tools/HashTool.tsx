"use client";

import { useState } from "react";
import { ToolLayout } from "./ToolLayout";

const ALGOS = ["SHA-256", "SHA-1", "MD5"] as const;

export default function HashTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [algo, setAlgo] = useState<(typeof ALGOS)[number]>("SHA-256");
  const [error, setError] = useState("");

  async function hash() {
    setError("");
    try {
      const algoName =
        algo === "MD5" ? "SHA-256" : algo; // MD5 需要额外库，用 SHA-256 代替说明
      const data = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest(algoName, data);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setOutput(hex);
      if (algo === "MD5") {
        setError("提示：浏览器不支持原生 MD5，已用 SHA-256 代替（MD5 已不安全，不建议使用）");
      }
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "计算失败");
    }
  }

  return (
    <ToolLayout
      title="文本哈希"
      desc="计算文本的 SHA-256 / SHA-1 哈希值（WebCrypto 本地计算）。"
      actions={
        <>
          <select
            value={algo}
            onChange={(e) => setAlgo(e.target.value as typeof ALGOS[number])}
            className="btn-tool"
          >
            {ALGOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button onClick={hash} className="btn-tool">
            计算哈希
          </button>
        </>
      }
      output={output}
      error={error}
      onInput={setInput}
      inputPlaceholder="输入文本…"
    />
  );
}
