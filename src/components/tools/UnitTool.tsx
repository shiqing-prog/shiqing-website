"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

type Category = "length" | "weight" | "storage" | "temperature";

const UNITS: Record<Exclude<Category, "temperature">, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, inch: 0.0254, foot: 0.3048, mile: 1609.344 },
  weight: { kg: 1, g: 0.001, t: 1000, lb: 0.45359237, oz: 0.028349523125 },
  storage: { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 },
};

const LABELS = {
  length: { m: "米", km: "千米", cm: "厘米", mm: "毫米", inch: "英寸", foot: "英尺", mile: "英里" },
  weight: { kg: "千克", g: "克", t: "吨", lb: "磅", oz: "盎司" },
  storage: { B: "字节", KB: "KB", MB: "MB", GB: "GB", TB: "TB" },
} as const;

export default function UnitTool() {
  const [cat, setCat] = useState<Category>("length");
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("cm");
  const [tempFrom, setTempFrom] = useState<"C" | "F" | "K">("C");
  const [tempTo, setTempTo] = useState<"F" | "C" | "K">("F");

  const num = Number(value);
  let result = "";
  let error = "";

  if (cat === "temperature") {
    if (Number.isFinite(num)) {
      // 先转摄氏度
      const c = tempFrom === "C" ? num : tempFrom === "F" ? ((num - 32) * 5) / 9 : num - 273.15;
      const out = tempTo === "C" ? c : tempTo === "F" ? (c * 9) / 5 + 32 : c + 273.15;
      result = `${Number(out.toFixed(4))} °${tempTo}`;
    } else {
      error = "请输入数字";
    }
  } else {
    const table = UNITS[cat];
    if (!Number.isFinite(num)) error = "请输入数字";
    else result = `${Number(((num * table[from]) / table[to]).toFixed(6))}`;
  }

  const keys = cat === "temperature" ? ["C", "F", "K"] : Object.keys(UNITS[cat]);
  const labels: Record<string, string> =
    cat === "temperature" ? { C: "摄氏度", F: "华氏度", K: "开尔文" } : LABELS[cat];

  function switchCat(next: Category) {
    setCat(next);
    if (next === "temperature") return;
    const ks = Object.keys(UNITS[next]);
    setFrom(ks[0]);
    setTo(ks[1] ?? ks[0]);
  }

  return (
    <div className="kratos-card p-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["length", "长度"],
            ["weight", "重量"],
            ["storage", "存储"],
            ["temperature", "温度"],
          ] as [Category, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => switchCat(k)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              cat === k
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="数值"
          />
          <select
            className={inputCls + " w-28"}
            value={cat === "temperature" ? tempFrom : from}
            onChange={(e) =>
              cat === "temperature"
                ? setTempFrom(e.target.value as "C" | "F" | "K")
                : setFrom(e.target.value)
            }
          >
            {keys.map((k) => (
              <option key={k} value={k}>
                {labels[k] ?? k}
              </option>
            ))}
          </select>
        </div>
        <span className="self-center text-center text-gray-400">→</span>
        <div className="flex gap-2">
          <input className={inputCls + " bg-gray-50 dark:bg-gray-800"} value={error || result} readOnly />
          <select
            className={inputCls + " w-28"}
            value={cat === "temperature" ? tempTo : to}
            onChange={(e) =>
              cat === "temperature"
                ? setTempTo(e.target.value as "C" | "F" | "K")
                : setTo(e.target.value)
            }
          >
            {keys.map((k) => (
              <option key={k} value={k}>
                {labels[k] ?? k}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        支持长度 / 重量 / 存储（1024 进制）/ 温度换算，实时计算
      </p>
    </div>
  );
}
