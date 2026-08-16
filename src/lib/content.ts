import type { Post, Project } from "./types";
import projectsData from "../../data/projects.json";
import postsData from "../../data/posts.json";

/**
 * 构建期数据源：数据在 `next build` 时编译进 bundle，
 * 运行时（含 Cloudflare Workers）不依赖文件系统。
 * 修改 data/*.json 后需重新构建部署。
 */
const projects = projectsData as Project[];
const posts = postsData as Post[];

export function getProjects(): Project[] {
  return [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPosts(onlyPublished = false): Post[] {
  const list = onlyPublished ? posts.filter((p) => p.published) : posts;
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug && p.published);
}
