"use client";

import { useMemo, useState } from "react";

/** 行级差异结果 */
type LineOp = { type: "eq" | "del" | "ins"; text: string; leftNo?: number; rightNo?: number };
/** 字符级片段 */
type Seg = { type: "eq" | "del" | "ins"; text: string };

const MAX_LINES = 1500;
const MAX_CHAR_DIFF = 1200;
/** 单对行的字符级 DP 预算（n*m）；超过就退化成整行高亮，避免页面卡死 */
const CHAR_DIFF_BUDGET = 400_000;

/** 预处理：按选项归一化空白 / 大小写 */
function normalize(line: string, ignoreWs: boolean, ignoreCase: boolean): string {
  let s = line;
  if (ignoreWs) s = s.replace(/\s+/g, "");
  else s = s.replace(/\s+$/, "");
  if (ignoreCase) s = s.toLowerCase();
  return s;
}

/** 经典 LCS 动态规划，返回行级操作序列 */
function diffLines(a: string[], b: string[], ignoreWs: boolean, ignoreCase: boolean): LineOp[] {
  const n = a.length;
  const m = b.length;
  const an = a.map((l) => normalize(l, ignoreWs, ignoreCase));
  const bn = b.map((l) => normalize(l, ignoreWs, ignoreCase));

  // 后缀 LCS 表：dp[i][j] = a[i..] 与 b[j..] 的 LCS 长度
  const w = m + 1;
  const dp = new Int32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] =
        an[i] === bn[j]
          ? dp[(i + 1) * w + j + 1] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }

  const ops: LineOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (an[i] === bn[j]) {
      ops.push({ type: "eq", text: a[i], leftNo: i + 1, rightNo: j + 1 });
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      ops.push({ type: "del", text: a[i], leftNo: i + 1 });
      i++;
    } else {
      ops.push({ type: "ins", text: b[j], rightNo: j + 1 });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "del", text: a[i], leftNo: i + 1 });
    i++;
  }
  while (j < m) {
    ops.push({ type: "ins", text: b[j], rightNo: j + 1 });
    j++;
  }
  return ops;
}

/** 对一对「删除行 + 新增行」做字符级对齐，用于高亮行内差异 */
function diffChars(oldLine: string, newLine: string): { del: Seg[]; ins: Seg[] } {
  if (oldLine.length > MAX_CHAR_DIFF || newLine.length > MAX_CHAR_DIFF) {
    return { del: [{ type: "del", text: oldLine }], ins: [{ type: "ins", text: newLine }] };
  }
  const n = oldLine.length;
  const m = newLine.length;
  if (n * m > CHAR_DIFF_BUDGET) {
    return { del: [{ type: "del", text: oldLine }], ins: [{ type: "ins", text: newLine }] };
  }
  const w = m + 1;
  const dp = new Int32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] =
        oldLine[i] === newLine[j]
          ? dp[(i + 1) * w + j + 1] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const del: Seg[] = [];
  const ins: Seg[] = [];
  const push = (arr: Seg[], type: Seg["type"], ch: string) => {
    const last = arr[arr.length - 1];
    if (last && last.type === type) last.text += ch;
    else arr.push({ type, text: ch });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLine[i] === newLine[j]) {
      push(del, "eq", oldLine[i]);
      push(ins, "eq", newLine[j]);
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      push(del, "del", oldLine[i]);
      i++;
    } else {
      push(ins, "ins", newLine[j]);
      j++;
    }
  }
  while (i < n) push(del, "del", oldLine[i++]);
  while (j < m) push(ins, "ins", newLine[j++]);
  return { del, ins };
}

const lineCls: Record<LineOp["type"], string> = {
  eq: "",
  del: "bg-red-50 dark:bg-red-950/40",
  ins: "bg-green-50 dark:bg-green-950/40",
};

const segCls: Record<Seg["type"], string> = {
  eq: "",
  del: "bg-red-200 dark:bg-red-900/70",
  ins: "bg-green-200 dark:bg-green-900/70",
};

export default function DiffTool() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [ignoreWs, setIgnoreWs] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);

  const result = useMemo(() => {
    if (left === "" && right === "") return null;
    const a = left.split("\n");
    const b = right.split("\n");
    if (a.length > MAX_LINES || b.length > MAX_LINES) {
      return {
        tooLong: true,
        a: a.length,
        b: b.length,
        ops: [] as LineOp[],
        added: 0,
        removed: 0,
        segPairs: new Map<number, { del: Seg[]; ins: Seg[] }>(),
      };
    }
    const ops = diffLines(a, b, ignoreWs, ignoreCase);
    let added = 0;
    let removed = 0;
    for (const op of ops) {
      if (op.type === "ins") added++;
      else if (op.type === "del") removed++;
    }
    // 预先成对算一次字符级差异，渲染时按「删除行的下标」查表：
    // 否则同一对 del/ins 会在两行各算一遍，最坏上千对 × 1200×1200 比较
    const segPairs = new Map<number, { del: Seg[]; ins: Seg[] }>();
    for (let i = 0; i < ops.length - 1; i++) {
      const cur = ops[i];
      const nxt = ops[i + 1];
      if (cur.type === "del" && nxt.type === "ins") {
        segPairs.set(i, diffChars(cur.text, nxt.text));
      }
    }
    return { tooLong: false, a: a.length, b: b.length, ops, added, removed, segPairs };
  }, [left, right, ignoreWs, ignoreCase]);

  const changed = result && !result.tooLong && result.added + result.removed > 0;

  return (
    <div className="kratos-card p-6">
      <h2 className="text-xl font-bold">文本对比 Diff</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        左右各贴一段文本，逐行比对差异，行内再高亮具体改动。所有计算都在本地浏览器完成。
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">原始文本</span>
          <textarea
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            rows={8}
            placeholder="粘贴旧版本…"
            className="input-tool mt-1.5 w-full resize-y font-mono text-xs"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">新文本</span>
          <textarea
            value={right}
            onChange={(e) => setRight(e.target.value)}
            rows={8}
            placeholder="粘贴新版本…"
            className="input-tool mt-1.5 w-full resize-y font-mono text-xs"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={ignoreWs} onChange={(e) => setIgnoreWs(e.target.checked)} />
          <span className="text-gray-600 dark:text-gray-300">忽略空白差异</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} />
          <span className="text-gray-600 dark:text-gray-300">忽略大小写</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setLeft(right);
            setRight(left);
          }}
          className="rounded-[2px] border border-gray-300 px-3 py-1.5 text-gray-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
        >
          ⇄ 交换左右
        </button>
        <button
          type="button"
          onClick={() => {
            setLeft("");
            setRight("");
          }}
          className="rounded-[2px] border border-gray-300 px-3 py-1.5 text-gray-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
        >
          清空
        </button>
      </div>

      {result?.tooLong && (
        <p className="mt-5 rounded-[2px] bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          文本太长了（左 {result.a} 行 / 右 {result.b} 行，上限 {MAX_LINES} 行），先截短一点再比吧。
        </p>
      )}

      {result && !result.tooLong && (
        <>
          <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">
            {changed ? (
              <>
                共 <span className="font-semibold text-green-600">+{result.added}</span> 行新增、
                <span className="font-semibold text-red-600"> −{result.removed}</span> 行删除（左 {result.a} 行 / 右{" "}
                {result.b} 行）
              </>
            ) : (
              <span className="text-green-600">两段文本完全一致 ✅</span>
            )}
          </p>

          {changed && (
            <div className="mt-3 overflow-x-auto rounded-[2px] border border-gray-200 dark:border-gray-700">
              <table className="w-full border-collapse font-mono text-xs">
                <tbody>
                  {result.ops.map((op, idx) => {
                    // 相邻的一删一增成对做字符级高亮，结果在 useMemo 里已算好
                    const pair =
                      op.type === "del" ? result.segPairs.get(idx) : op.type === "ins" ? result.segPairs.get(idx - 1) : undefined;
                    const segs = op.type === "del" ? (pair?.del ?? null) : op.type === "ins" ? (pair?.ins ?? null) : null;
                    return (
                      <tr key={idx} className={lineCls[op.type]}>
                        <td className="w-10 select-none border-r border-gray-200 px-2 text-right align-top text-gray-400 dark:border-gray-700">
                          {op.leftNo ?? ""}
                        </td>
                        <td className="w-10 select-none border-r border-gray-200 px-2 text-right align-top text-gray-400 dark:border-gray-700">
                          {op.rightNo ?? ""}
                        </td>
                        <td className="w-4 select-none text-center align-top text-gray-400">
                          {op.type === "del" ? "−" : op.type === "ins" ? "+" : " "}
                        </td>
                        <td className="whitespace-pre-wrap break-all px-2">
                          {segs
                            ? segs.map((s, k) => (
                                <span key={k} className={segCls[s.type]}>
                                  {s.text}
                                </span>
                              ))
                            : op.text || " "}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="mt-6 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        说明：行级差异用 LCS（最长公共子序列）计算，相邻的一删一增会再做字符级对齐，所以改动通常能精确到某几个字。单侧上限{" "}
        {MAX_LINES} 行。
      </p>
    </div>
  );
}
