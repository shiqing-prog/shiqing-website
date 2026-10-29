import { apiJson, authenticate, enforceQuota, preflight } from "@/lib/api";
import { getDb } from "@/lib/data";

export function OPTIONS() {
  return preflight();
}

/** GET /api/v1/boards —— 全部板块 */
export async function GET(request: Request) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const quota = await enforceQuota(result.auth);
  if (quota) return quota;

  const db = await getDb();
  const boards = await db.listBoards();
  return apiJson({
    data: boards.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      description: b.description,
      post_count: b.post_count ?? 0,
    })),
  });
}
