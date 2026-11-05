import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { getDb } from "@/lib/data";
import { isValidShortCode } from "@/lib/shortlink";

/** 短链的短地址基址（二维码里编码短链本身，扫码也走一次点击统计） */
const SHORT_BASE = "https://shiqing.site/s/";

/**
 * GET /s/<code>/qr.png —— 短链二维码（PNG）
 *
 * 生成的是**短链地址**而不是目标地址：扫码方仍然经过 302 跳转，
 * 点击统计照常累加，短链删掉后二维码也就自然失效。
 */
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

  const buf = await QRCode.toBuffer(SHORT_BASE + code, {
    type: "png",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });

  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400",
    },
  });
}
