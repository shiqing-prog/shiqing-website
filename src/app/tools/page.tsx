"use client";

import { useState } from "react";
import JsonTool from "@/components/tools/JsonTool";
import Base64Tool from "@/components/tools/Base64Tool";
import TimestampTool from "@/components/tools/TimestampTool";
import TextStatsTool from "@/components/tools/TextStatsTool";
import ColorTool from "@/components/tools/ColorTool";
import UuidTool from "@/components/tools/UuidTool";

const tools = [
  { key: "json", label: "JSON 格式化", icon: "🧩", desc: "格式化 / 压缩 / 校验", comp: JsonTool },
  { key: "base64", label: "Base64", icon: "🔐", desc: "文本与 Base64 互转", comp: Base64Tool },
  { key: "timestamp", label: "时间戳", icon: "🕐", desc: "时间戳与日期互转", comp: TimestampTool },
  { key: "textstats", label: "文本统计", icon: "📊", desc: "字数 / 字符 / 行数", comp: TextStatsTool },
  { key: "color", label: "颜色转换", icon: "🎨", desc: "HEX 与 RGB 互转", comp: ColorTool },
  { key: "uuid", label: "UUID 生成", icon: "🆔", desc: "批量生成 UUID v4", comp: UuidTool },
] as const;

type ToolKey = (typeof tools)[number]["key"];

export default function ToolsPage() {
  const [active, setActive] = useState<ToolKey>("json");
  const ActiveComp = tools.find((t) => t.key === active)!.comp;

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-bold">实用工具</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        一些日常开发常用的小工具，所有计算都在浏览器本地完成，不会上传任何数据。
      </p>

      {/* 工具选择区 */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tools.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              active === t.key
                ? "border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
            }`}
          >
            <span className="text-2xl">{t.icon}</span>
            <span>
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                {t.desc}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* 工具区 */}
      <div className="mt-8">
        <ActiveComp />
      </div>
    </div>
  );
}
