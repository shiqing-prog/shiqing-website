import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { getDb } from "@/lib/data";
import { isValidShortCode } from "@/lib/shortlink";

const SHORT_BASE = "https://shiqing.site/s/";

/** GET /s/<code>/qr.svg —— 短链二维码（矢量版，适合印刷/贴纸） */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!isValidShortCode(code)) {
    return NextResponse.json({ error: "短码不合法" }, { status: 400 });
  }

  const db = await getDb();
  const link = await db.getShortLink(code);
  if (!link) return NextResponse.json({ error: "短链不存在" }, { status: 404 });

  const svg = await QRCode.toString(SHORT_BASE + code, {
    type: "svg",
    margin: 1,
    width: 512,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
