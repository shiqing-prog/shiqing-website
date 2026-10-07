import { NextResponse } from "next/server";
import { checkStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

/** GET /api/status —— 站点各依赖服务的健康状态（JSON，供监控/脚本使用） */
export async function GET() {
  const report = await checkStatus();
  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
