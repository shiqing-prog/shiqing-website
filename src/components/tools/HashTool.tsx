"use client";

import { useState } from "react";
import { ToolLayout } from "./ToolLayout";
import { md5 } from "@/lib/md5";

const ALGOS = ["SHA-256", "SHA-1", "MD5"] as const;

export default function HashTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [algo, setAlgo] = useState<(typeof ALGOS)[number]>("SHA-256");
  const [error, setError] = useState("");

  async function hash() {
    setError("");
    setOutput("");
    try {
      // WebCrypto 没有 MD5，走内置实现；其余算法用原生 digest
      if (algo === "MD5") {
        setOutput(md5(input));
        return;
      }
      const digest = await crypto.subtle.digest(
        algo,
        new TextEncoder().encode(input)
      );
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setOutput(hex);
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "计算失败");
    }
  }

  return (
    <ToolLayout
      title="文本哈希"
      desc="计算文本的 SHA-256 / SHA-1 / MD5 哈希值，全部在浏览器本地完成，不上传任何内容。MD5 仅用于兼容老系统校验，不再适合安全用途。"
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
      value={input}
      onInput={setInput}
      inputPlaceholder="输入文本…"
    />
  );
}
