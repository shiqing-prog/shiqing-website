import type { BlogPost, Project } from "./types";
import projectsData from "../../data/projects.json";
import postsData from "../../data/posts.json";
import changelogData from "../../data/changelog.json";

/**
 * 构建期数据源：数据在 `next build` 时编译进 bundle，
 * 运行时（含 Cloudflare Workers）不依赖文件系统。
 * 修改 data/*.json 后需重新构建部署。
 */
const projects = projectsData as Project[];
const posts = postsData as BlogPost[];

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

const changelog = changelogData as ChangelogEntry[];

export function getProjects(): Project[] {
  return [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPosts(onlyPublished = false): BlogPost[] {
  const list = onlyPublished ? posts.filter((p) => p.published) : posts;
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug && p.published);
}

/** 更新日志（最新在前） */
export function getChangelog(): ChangelogEntry[] {
  return [...changelog].sort((a, b) => b.date.localeCompare(a.date));
}
