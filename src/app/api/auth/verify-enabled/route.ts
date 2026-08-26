import { NextResponse } from "next/server";

export async function GET() {
  let enabled = false;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    enabled = (env as unknown as { VERIFY_EMAIL?: string }).VERIFY_EMAIL === "true";
  } catch {
    /* 本地默认关闭 */
  }
  return NextResponse.json({ enabled });
}
