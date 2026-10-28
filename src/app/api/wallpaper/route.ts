import { NextResponse } from "next/server";

// 壁纸每天才换一次：让 CDN/浏览器缓存半小时，回源失败时用上一次成功的结果兜底。
// 原来 force-dynamic + no-store，每个访客每次打开工具页都实打实打一次 Bing。
export const revalidate = 1800;

const CACHE = "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400";

type Wallpaper = { url: string; title: string; copyright: string };

/** 同一个 Worker 实例内记住上一次成功的结果，供 Bing 抽风时降级 */
let lastGood: Wallpaper | null = null;

export async function GET() {
  try {
    const res = await fetch(
      "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1",
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) throw new Error(`bing ${res.status}`);
    const data = (await res.json()) as {
      images?: { url?: string; title?: string; copyright?: string }[];
    };
    const img = data.images?.[0];
    if (!img?.url) throw new Error("no image");
    const body: Wallpaper = {
      url: `https://cn.bing.com${img.url}`,
      title: img.title || "每日壁纸",
      copyright: img.copyright || "",
    };
    lastGood = body;
    return NextResponse.json(body, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[wallpaper]", err);
    if (lastGood) {
      return NextResponse.json(lastGood, {
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }
    return NextResponse.json({ error: "获取壁纸失败" }, { status: 502 });
  }
}
