"use client";

import { useState } from "react";
import JsonTool from "@/components/tools/JsonTool";
import Base64Tool from "@/components/tools/Base64Tool";
import TimestampTool from "@/components/tools/TimestampTool";
import TextStatsTool from "@/components/tools/TextStatsTool";
import ColorTool from "@/components/tools/ColorTool";
import UuidTool from "@/components/tools/UuidTool";
import UrlTool from "@/components/tools/UrlTool";
import PasswordTool from "@/components/tools/PasswordTool";
import HashTool from "@/components/tools/HashTool";
import RegexTool from "@/components/tools/RegexTool";
import RadixTool from "@/components/tools/RadixTool";
import WallpaperTool from "@/components/tools/WallpaperTool";
import ImageToBase64Tool from "@/components/tools/ImageToBase64Tool";
import RandomTool from "@/components/tools/RandomTool";
import UnitTool from "@/components/tools/UnitTool";
import LineTool from "@/components/tools/LineTool";
import Base64ImageTool from "@/components/tools/Base64ImageTool";
import JsonToTsTool from "@/components/tools/JsonToTsTool";
import PaletteTool from "@/components/tools/PaletteTool";
import MarkdownTool from "@/components/tools/MarkdownTool";
import CronTool from "@/components/tools/CronTool";
import ContrastTool from "@/components/tools/ContrastTool";
import ImageCompressTool from "@/components/tools/ImageCompressTool";
import DiffTool from "@/components/tools/DiffTool";
import JwtTool from "@/components/tools/JwtTool";

const tools = [
  { key: "json", label: "JSON 格式化", icon: "🧩", desc: "格式化 / 压缩 / 校验", comp: JsonTool },
  { key: "base64", label: "Base64", icon: "🔐", desc: "文本与 Base64 互转", comp: Base64Tool },
  { key: "timestamp", label: "时间戳", icon: "🕐", desc: "时间戳与日期互转", comp: TimestampTool },
  { key: "textstats", label: "文本统计", icon: "📊", desc: "字数 / 字符 / 行数", comp: TextStatsTool },
  { key: "color", label: "颜色转换", icon: "🎨", desc: "HEX 与 RGB 互转", comp: ColorTool },
  { key: "uuid", label: "UUID 生成", icon: "🆔", desc: "批量生成 UUID v4", comp: UuidTool },
  { key: "url", label: "URL 编解码", icon: "🔗", desc: "URL 编码 / 解码", comp: UrlTool },
  { key: "password", label: "密码生成", icon: "🔑", desc: "随机强密码生成", comp: PasswordTool },
  { key: "hash", label: "文本哈希", icon: "🧮", desc: "SHA-256 / SHA-1", comp: HashTool },
  { key: "regex", label: "正则测试", icon: "🧪", desc: "正则匹配测试", comp: RegexTool },
  { key: "radix", label: "进制转换", icon: "🔢", desc: "2/8/10/16 进制互转", comp: RadixTool },
  { key: "wallpaper", label: "每日壁纸", icon: "🖼️", desc: "必应每日壁纸（API）", comp: WallpaperTool },
  { key: "img2b64", label: "图片转Base64", icon: "🖼️", desc: "图片转 Data URL", comp: ImageToBase64Tool },
  { key: "imgcompress", label: "图片压缩", icon: "🗜️", desc: "压缩 / 转 WebP·AVIF / 缩放", comp: ImageCompressTool },
  { key: "random", label: "随机数", icon: "🎲", desc: "范围随机整数生成", comp: RandomTool },
  { key: "unit", label: "单位换算", icon: "📏", desc: "长度 / 重量 / 存储 / 温度", comp: UnitTool },
  { key: "line", label: "文本行处理", icon: "📋", desc: "去重 / 排序 / 去空行", comp: LineTool },
  { key: "b64img", label: "Base64 转图片", icon: "🏞️", desc: "Base64 解码为图片", comp: Base64ImageTool },
  { key: "json2ts", label: "JSON 转 TS", icon: "🧬", desc: "JSON 生成 TS 接口", comp: JsonToTsTool },
  { key: "palette", label: "调色板", icon: "🌈", desc: "生成 11 级明暗梯度", comp: PaletteTool },
  { key: "md", label: "Markdown 预览", icon: "📝", desc: "实时渲染 Markdown", comp: MarkdownTool },
  { key: "cron", label: "Cron 解析", icon: "⏰", desc: "解析表达式 + 下次执行", comp: CronTool },
  { key: "contrast", label: "对比度检查", icon: "🌓", desc: "WCAG 无障碍对比度", comp: ContrastTool },
  { key: "diff", label: "文本对比", icon: "🔀", desc: "逐行 / 逐字 diff 高亮", comp: DiffTool },
  { key: "jwt", label: "JWT 解析", icon: "🎫", desc: "解码 token / 验签 / 过期", comp: JwtTool },
] as const;

type ToolKey = (typeof tools)[number]["key"];

export default function ToolsIndex() {
  const [active, setActive] = useState<ToolKey>("json");
  const [query, setQuery] = useState("");
  const ActiveComp = tools.find((t) => t.key === active)!.comp;

  const q = query.trim().toLowerCase();
  const shown = q === "" ? tools : tools.filter((t) => (t.label + t.desc + t.key).toLowerCase().includes(q));

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-bold">实用工具</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        一些日常开发常用的小工具，所有计算都在浏览器本地完成，不会上传任何数据。
      </p>

      {/* 搜索 */}
      <div className="mt-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜工具：json / base64 / 图片 / diff…"
          className="input-tool w-full"
        />
        {q !== "" && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {shown.length === 0 ? "没找到匹配的工具，换个关键词试试？" : `找到 ${shown.length} 个工具`}
          </p>
        )}
      </div>

      {/* 工具选择区 */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((t) => (
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
