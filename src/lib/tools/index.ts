import { CONTENT_TOOLS } from "./content";
import { DATA_TOOLS } from "./data";
import { DEV_TOOLS } from "./dev";
import { TEXT_TOOLS } from "./text";
import { WEB_TOOLS } from "./web";
import type { ToolDef } from "./types";

/** 全部工具，顺序即目录里的展示顺序 */
export const TOOLS: ToolDef[] = [...TEXT_TOOLS, ...DEV_TOOLS, ...DATA_TOOLS, ...WEB_TOOLS, ...CONTENT_TOOLS];

/** 名字（如 text/stats）到工具定义的映射，路由用它分发 */
export const TOOL_MAP: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((tool) => [tool.name, tool]));

export interface ToolGroup {
  key: string;
  label: string;
  description: string;
  count: number;
}

const GROUP_META: Record<string, { label: string; description: string }> = {
  text: { label: "文本处理", description: "统计、命名风格、编码、哈希、CSV、对比与转义" },
  dev: { label: "开发辅助", description: "UUID、密码、颜色、Cron、JWT、正则与状态码" },
  data: { label: "数据换算", description: "时间、进制、单位、中文数字、BMI 与随机" },
  web: { label: "网页工具", description: "UA、URL、地理、请求头、占位图与网页元信息" },
  content: { label: "内容素材", description: "一言、名言、诗词、颜色名与 Unicode 信息" },
};

export const TOOL_GROUPS: ToolGroup[] = Object.entries(GROUP_META).map(([key, meta]) => ({
  key,
  label: meta.label,
  description: meta.description,
  count: TOOLS.filter((tool) => tool.group === key).length,
}));

/** 目录接口用的精简结构 */
export function toolCatalog() {
  return TOOLS.map((tool) => ({
    name: tool.name,
    group: tool.group,
    summary: tool.summary,
    methods: tool.methods,
    params: tool.params,
    path: "/api/v1/tools/" + tool.name,
  }));
}

export type { ToolDef, ToolParam, ToolContext } from "./types";
export { ToolError } from "./types";
