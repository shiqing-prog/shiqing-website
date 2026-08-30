import changelogData from "../../data/changelog.json";

/**
 * 构建期数据源（仅更新日志）：数据在 `next build` 时编译进 bundle，
 * 运行时（含 Cloudflare Workers）不依赖文件系统。修改后需重新构建部署。
 *
 * 项目/博客内容已迁移到运行时数据源 src/lib/store.ts（线上 D1 site_content /
 * 本地 data/*.json），admin 修改无需重新构建即可生效。
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  category?: "new" | "improve" | "fix" | "security" | "docs";
  items: string[];
}

const changelog = changelogData as ChangelogEntry[];

/** 更新日志（最新在前） */
export function getChangelog(): ChangelogEntry[] {
  return [...changelog].sort((a, b) => b.date.localeCompare(a.date));
}
