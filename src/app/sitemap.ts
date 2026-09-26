import type { MetadataRoute } from "next";
import { getDb } from "@/lib/data";

export const dynamic = "force-dynamic";

const BASE = "https://shiqing.site";

/** 站点地图：静态页面 + 板块 + 最新帖子（运行时读数据库） */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/files`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/tags`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/games`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/stats`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/projects`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
    { url: `${BASE}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];

  try {
    const db = await getDb();
    const [boards, posts] = await Promise.all([
      db.listBoards(),
      db.listPosts({ page: 1, pageSize: 50 }),
    ]);

    const boardPages: MetadataRoute.Sitemap = boards.map((b) => ({
      url: `${BASE}/bbs/board/${b.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    }));

    const postPages: MetadataRoute.Sitemap = posts.posts.map((p) => ({
      url: `${BASE}/bbs/post/${p.id}`,
      lastModified: new Date(p.updated_at || p.created_at),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticPages, ...boardPages, ...postPages];
  } catch {
    // 数据库不可用时（如纯静态构建）只输出静态页面
    return staticPages;
  }
}
