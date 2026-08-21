import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://shiqing.site";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/files`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/projects`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];
}
