import { apiJson, authenticate, enforceQuota, preflight } from "@/lib/api";
import { getChangelog } from "@/lib/content";

export function OPTIONS() {
  return preflight();
}

/** GET /api/v1/changelog?limit=20 —— 更新日志（最新在前） */
export async function GET(request: Request) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const quota = await enforceQuota(result.auth);
  if (quota) return quota;

  const raw = new URL(request.url).searchParams.get("limit");
  const n = Math.floor(Number(raw ?? 20));
  const limit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 100) : 20;

  const all = getChangelog();
  return apiJson({
    data: all.slice(0, limit),
    meta: { total: all.length, limit },
  });
}
