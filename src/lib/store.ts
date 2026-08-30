import { promises as fs } from "node:fs";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { BlogPost, Project, ProjectInput, BlogPostInput } from "./types";
import { uid, slugify } from "./id";

/**
 * 作品/博客内容存储（双后端）：
 * - 线上（Cloudflare Workers）：写入 D1 `site_content` 表（key-value JSON 块），
 *   解决 Workers 无文件系统导致 admin 写接口无法持久化的问题；
 * - 本地（next dev）：沿用 data/*.json 文件（原子写 tmp+rename），开发体验不变。
 * 修改后无需重新构建即可在线上生效（/projects 页与 GET API 均改读运行时数据）。
 */

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");

const KEY_PROJECTS = "projects";
const KEY_POSTS = "posts";

/** D1 查询能力（与 data.ts 一致的鸭子类型） */
type D1Database = {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      all(): Promise<{ results: unknown[] }>;
      first(): Promise<unknown>;
      run(): Promise<{ meta: { changes: number } }>;
    };
  };
};

let d1Cache: D1Database | null | undefined; // undefined = 尚未探测

async function getD1(): Promise<D1Database | null> {
  if (d1Cache !== undefined) return d1Cache;
  try {
    const { env } = await getCloudflareContext({ async: true });
    d1Cache = (env as unknown as { dsh_bbs?: D1Database }).dsh_bbs ?? null;
  } catch {
    d1Cache = null;
  }
  return d1Cache;
}

async function readContent<T>(key: string, file: string, fallback: T): Promise<T> {
  const d1 = await getD1();
  if (d1) {
    const row = await d1
      .prepare("SELECT data FROM site_content WHERE key = ?")
      .bind(key)
      .first();
    if (row) {
      try {
        return JSON.parse((row as { data: string }).data) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
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

async function writeContent<T>(key: string, file: string, data: T): Promise<void> {
  const d1 = await getD1();
  const json = JSON.stringify(data, null, 2);
  if (d1) {
    await d1
      .prepare(
        "INSERT INTO site_content (key, data, updated_at) VALUES (?, ?, ?) " +
          "ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
      )
      .bind(key, json, new Date().toISOString())
      .run();
    return;
  }
  // 本地：先写临时文件再重命名，避免写一半损坏数据
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, json, "utf-8");
  await fs.rename(tmp, file);
}

/* ---------- Projects ---------- */

export async function getProjects(): Promise<Project[]> {
  const projects = await readContent<Project[]>(KEY_PROJECTS, PROJECTS_FILE, []);
  return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProject(id: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((p) => p.id === id);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const projects = await readContent<Project[]>(KEY_PROJECTS, PROJECTS_FILE, []);
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
  await writeContent(KEY_PROJECTS, PROJECTS_FILE, projects);
  return project;
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const projects = await readContent<Project[]>(KEY_PROJECTS, PROJECTS_FILE, []);
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
  await writeContent(KEY_PROJECTS, PROJECTS_FILE, projects);
  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await readContent<Project[]>(KEY_PROJECTS, PROJECTS_FILE, []);
  await writeContent(
    KEY_PROJECTS,
    PROJECTS_FILE,
    projects.filter((p) => p.id !== id)
  );
}

/* ---------- Posts ---------- */

export async function getPosts(onlyPublished = false): Promise<BlogPost[]> {
  const posts = await readContent<BlogPost[]>(KEY_POSTS, POSTS_FILE, []);
  return posts
    .filter((p) => !onlyPublished || p.published)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug && p.published);
}

export async function createPost(input: BlogPostInput): Promise<BlogPost> {
  const posts = await readContent<BlogPost[]>(KEY_POSTS, POSTS_FILE, []);
  const post: BlogPost = {
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
  await writeContent(KEY_POSTS, POSTS_FILE, posts);
  return post;
}

export async function updatePost(id: string, input: BlogPostInput): Promise<BlogPost> {
  const posts = await readContent<BlogPost[]>(KEY_POSTS, POSTS_FILE, []);
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("文章不存在");
  const existing = posts[idx];
  const updated: BlogPost = {
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
  await writeContent(KEY_POSTS, POSTS_FILE, posts);
  return updated;
}

export async function deletePost(id: string): Promise<void> {
  const posts = await readContent<BlogPost[]>(KEY_POSTS, POSTS_FILE, []);
  await writeContent(
    KEY_POSTS,
    POSTS_FILE,
    posts.filter((p) => p.id !== id)
  );
}
