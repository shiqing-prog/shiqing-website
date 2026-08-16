import { promises as fs } from "node:fs";
import path from "node:path";
import type { Post, Project, ProjectInput, PostInput } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw err;
  }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  // 先写入临时文件再重命名，避免写一半损坏数据
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------- Projects ---------- */

export async function getProjects(): Promise<Project[]> {
  const projects = await readJson<Project[]>(PROJECTS_FILE, []);
  return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProject(id: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((p) => p.id === id);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const projects = await readJson<Project[]>(PROJECTS_FILE, []);
  const project: Project = {
    id: input.id?.trim() || uid(),
    title: input.title.trim(),
    description: input.description.trim(),
    tech: Array.isArray(input.tech) ? input.tech.map((t) => t.trim()).filter(Boolean) : [],
    link: input.link?.trim() || "",
    github: input.github?.trim() || "",
    featured: Boolean(input.featured),
    createdAt: input.createdAt?.trim() || new Date().toISOString().slice(0, 10),
  };
  if (!project.title) throw new Error("标题不能为空");
  if (projects.some((p) => p.id === project.id)) throw new Error("项目 ID 已存在");
  projects.push(project);
  await writeJson(PROJECTS_FILE, projects);
  return project;
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const projects = await readJson<Project[]>(PROJECTS_FILE, []);
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("项目不存在");
  const existing = projects[idx];
  const updated: Project = {
    ...existing,
    title: input.title.trim() || existing.title,
    description: input.description.trim() || existing.description,
    tech: Array.isArray(input.tech)
      ? input.tech.map((t) => t.trim()).filter(Boolean)
      : existing.tech,
    link: input.link?.trim() ?? existing.link,
    github: input.github?.trim() ?? existing.github,
    featured: Boolean(input.featured),
    createdAt: input.createdAt?.trim() || existing.createdAt,
  };
  projects[idx] = updated;
  await writeJson(PROJECTS_FILE, projects);
  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await readJson<Project[]>(PROJECTS_FILE, []);
  await writeJson(
    PROJECTS_FILE,
    projects.filter((p) => p.id !== id)
  );
}

/* ---------- Posts ---------- */

export async function getPosts(onlyPublished = false): Promise<Post[]> {
  const posts = await readJson<Post[]>(POSTS_FILE, []);
  return posts
    .filter((p) => !onlyPublished || p.published)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug && p.published);
}

export async function createPost(input: PostInput): Promise<Post> {
  const posts = await readJson<Post[]>(POSTS_FILE, []);
  const post: Post = {
    id: input.id?.trim() || uid(),
    slug: slugify(input.slug || input.title) || uid(),
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    content: input.content,
    date: input.date?.trim() || new Date().toISOString().slice(0, 10),
    tags: Array.isArray(input.tags) ? input.tags.map((t) => t.trim()).filter(Boolean) : [],
    published: Boolean(input.published),
  };
  if (!post.title) throw new Error("标题不能为空");
  if (posts.some((p) => p.slug === post.slug)) throw new Error("slug 已存在");
  posts.push(post);
  await writeJson(POSTS_FILE, posts);
  return post;
}

export async function updatePost(id: string, input: PostInput): Promise<Post> {
  const posts = await readJson<Post[]>(POSTS_FILE, []);
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("文章不存在");
  const existing = posts[idx];
  const updated: Post = {
    ...existing,
    slug: slugify(input.slug || input.title) || existing.slug,
    title: input.title.trim() || existing.title,
    excerpt: input.excerpt.trim() || existing.excerpt,
    content: input.content,
    date: input.date?.trim() || existing.date,
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => t.trim()).filter(Boolean)
      : existing.tags,
    published: Boolean(input.published),
  };
  if (posts.some((p) => p.slug === updated.slug && p.id !== id)) {
    throw new Error("slug 已存在");
  }
  posts[idx] = updated;
  await writeJson(POSTS_FILE, posts);
  return updated;
}

export async function deletePost(id: string): Promise<void> {
  const posts = await readJson<Post[]>(POSTS_FILE, []);
  await writeJson(
    POSTS_FILE,
    posts.filter((p) => p.id !== id)
  );
}
