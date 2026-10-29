import { apiJson, authenticate, enforceQuota, preflight } from "@/lib/api";
import { getDb } from "@/lib/data";

export function OPTIONS() {
  return preflight();
}

/** GET /api/v1/tags?limit=100 —— 标签云（按帖子数降序） */
export async function GET(request: Request) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const quota = await enforceQuota(result.auth);
  if (quota) return quota;

  const raw = new URL(request.url).searchParams.get("limit");
  const n = Math.floor(Number(raw ?? 100));
  const limit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 200) : 100;

  const db = await getDb();
  const tags = await db.listTags(limit);
  return apiJson({ data: tags, meta: { limit } });
}
