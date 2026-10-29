import { apiJson, authenticate, enforceQuota, preflight } from "@/lib/api";
import { getDb } from "@/lib/data";

export function OPTIONS() {
  return preflight();
}

/** GET /api/v1/stats —— 站点总览统计 */
export async function GET(request: Request) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const quota = await enforceQuota(result.auth);
  if (quota) return quota;

  const db = await getDb();
  const stats = await db.getSiteStats();
  return apiJson({
    data: stats,
    meta: { generated_at: new Date().toISOString() },
  });
}
