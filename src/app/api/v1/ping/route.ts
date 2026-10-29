import { apiJson, preflight, API_VERSION } from "@/lib/api";

export function OPTIONS() {
  return preflight();
}

/** GET /api/v1/ping —— 连通性检查，不需要凭证 */
export function GET() {
  return apiJson({
    ok: true,
    service: "shiqing-api",
    version: API_VERSION,
    time: new Date().toISOString(),
  });
}
