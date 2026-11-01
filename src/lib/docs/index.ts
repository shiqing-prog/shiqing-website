import type { DocGroup, DocGroupId, DocNavGroup, DocPage } from "./types";
import { START_PAGES } from "./content-start";
import { GUIDE_PAGES } from "./content-guide";
import { API_PAGES } from "./content-api";
import { REFERENCE_PAGES } from "./content-reference";

export type { DocGroup, DocNavGroup, DocPage } from "./types";

/** 分组的展示顺序与文案 */
const GROUP_META: { id: DocGroupId; label: string; description: string }[] = [
  {
    id: "start",
    label: "开始",
    description: "这个站是什么、怎么注册登录、每个页面在干什么。",
  },
  {
    id: "guide",
    label: "功能指南",
    description: "论坛、文件库、工具箱、游戏、测评、短链、卡密……逐项说明怎么用。",
  },
  {
    id: "api",
    label: "开发者 API",
    description: "用卡密或 sk_ 令牌以程序方式读取站点数据，全部端点与错误码。",
  },
  {
    id: "reference",
    label: "参考",
    description: "常见问题、配额与限制、技术栈，以及这个站是怎么来的。",
  },
];

const PAGES: DocPage[] = [
  ...START_PAGES,
  ...GUIDE_PAGES,
  ...API_PAGES,
  ...REFERENCE_PAGES,
];

/** 按分组切好、组内已排序的完整文档树（侧边栏直接用） */
export const DOC_GROUPS: DocGroup[] = GROUP_META.map((meta) => ({
  ...meta,
  pages: PAGES.filter((p) => p.group === meta.id).sort((a, b) => a.order - b.order),
}));

/** 精简导航：只有标题没有正文，可以安全传给客户端组件 */
export const DOC_NAV: DocNavGroup[] = DOC_GROUPS.map((g) => ({
  id: g.id,
  label: g.label,
  description: g.description,
  pages: g.pages.map((p) => ({ slug: p.slug, title: p.title })),
}));

/** 扁平列表，顺序与侧边栏一致（上一篇/下一篇按这个走） */
export const DOCS: DocPage[] = DOC_GROUPS.flatMap((g) => g.pages);

export function getDoc(slug: string): DocPage | undefined {
  return DOCS.find((p) => p.slug === slug);
}

export function getGroup(slug: string): DocGroup | undefined {
  return DOC_GROUPS.find((g) => g.pages.some((p) => p.slug === slug));
}

/** 侧边栏里该高亮哪一条：/docs/<slug> 精确匹配 */
export function getDocNeighbors(slug: string): {
  prev: DocPage | null;
  next: DocPage | null;
} {
  const i = DOCS.findIndex((p) => p.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? DOCS[i - 1] : null,
    next: i < DOCS.length - 1 ? DOCS[i + 1] : null,
  };
}