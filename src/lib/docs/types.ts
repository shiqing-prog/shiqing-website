/**
 * 文档站（/docs）的内容模型。
 *
 * 正文用 Markdown 存在 TS 里（数组 join），构建时随 RSC 一起打包：
 * - 不依赖 fs / loader，Worker 里可以直接渲染
 * - 复用 src/lib/markdown.ts 的安全渲染（html: false，天然防 XSS）
 * - 与 data/changelog.json 同一种「内容即代码」模式
 */
export type DocGroupId = "start" | "guide" | "api" | "reference";

export interface DocPage {
  /** URL 片段，/docs/<slug> */
  slug: string;
  group: DocGroupId;
  title: string;
  /** 首页卡片与搜索结果里的一句话简介 */
  summary: string;
  /** 组内排序，小的在前 */
  order: number;
  /** 最后更新日期，YYYY-MM-DD */
  updated: string;
  /** Markdown 正文 */
  body: string;
}

export interface DocGroupMeta {
  id: DocGroupId;
  label: string;
  description: string;
}

export interface DocGroup extends DocGroupMeta {
  pages: DocPage[];
}
/** 侧边栏只需要标题，不传正文（避免整份 Markdown 进客户端边界） */
export interface DocNavPage {
  slug: string;
  title: string;
}

export interface DocNavGroup extends DocGroupMeta {
  pages: DocNavPage[];
}
