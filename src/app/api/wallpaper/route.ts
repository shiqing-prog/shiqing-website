import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(
      "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1",
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("bing request failed");
    const data = (await res.json()) as {
      images?: { url?: string; title?: string; copyright?: string }[];
    };
    const img = data.images?.[0];
    if (!img?.url) throw new Error("no image");
    return NextResponse.json({
      url: `https://cn.bing.com${img.url}`,
      title: img.title || "每日壁纸",
      copyright: img.copyright || "",
    });
  } catch {
    return NextResponse.json({ error: "获取壁纸失败" }, { status: 502 });
  }
}
