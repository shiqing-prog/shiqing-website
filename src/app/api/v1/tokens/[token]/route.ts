import { apiError, apiJson, authenticate, preflight } from "@/lib/api";
import { getDb } from "@/lib/data";

export function OPTIONS() {
  return preflight();
}

/** DELETE /api/v1/tokens/{token} —— 吊销令牌（只能吊销自己卡密下的） */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const { token } = await params;
  const db = await getDb();
  const ok = await db.revokeApiToken(token, result.auth.cardKey);
  if (!ok) return apiError(404, "token_not_found", "令牌不存在或已吊销");

  return apiJson({ data: { token, revoked: true } });
}
