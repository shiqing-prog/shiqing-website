import {
  apiJson,
  authenticate,
  cardView,
  DAILY_LIMIT,
  enforceQuota,
  PER_MINUTE_LIMIT,
  preflight,
  todayUsage,
} from "@/lib/api";
import { getDb } from "@/lib/data";

export function OPTIONS() {
  return preflight();
}

/** GET /api/v1/me —— 当前凭证对应的卡密、今日用量与令牌列表 */
export async function GET(request: Request) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const quota = await enforceQuota(result.auth);
  if (quota) return quota;

  const db = await getDb();
  const [today, tokens] = await Promise.all([
    todayUsage(result.auth.cardKey),
    db.listApiTokens(result.auth.cardKey),
  ]);

  return apiJson({
    data: {
      card: cardView(result.auth.card),
      usage: {
        today,
        daily_limit: DAILY_LIMIT,
        per_minute_limit: PER_MINUTE_LIMIT,
      },
      tokens: tokens.map((t) => ({
        token: t.token,
        label: t.label,
        created_at: t.created_at,
        last_used_at: t.last_used_at,
        revoked: t.revoked === 1,
      })),
    },
  });
}
