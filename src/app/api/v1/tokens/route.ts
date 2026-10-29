import {
  apiError,
  apiJson,
  authenticate,
  enforceQuota,
  newApiToken,
  preflight,
} from "@/lib/api";
import { getDb } from "@/lib/data";
import { asString, readJsonBody } from "@/lib/http";
import { checkRateLimit } from "@/lib/ratelimit";
import { nowSec } from "@/lib/card";

export function OPTIONS() {
  return preflight();
}

/** 每张卡密最多保留 10 个未吊销令牌 */
const MAX_TOKENS = 10;

/** GET /api/v1/tokens —— 该卡密下的令牌列表 */
export async function GET(request: Request) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  const quota = await enforceQuota(result.auth);
  if (quota) return quota;

  const db = await getDb();
  const tokens = await db.listApiTokens(result.auth.cardKey);
  return apiJson({
    data: tokens.map((t) => ({
      token: t.token,
      label: t.label,
      created_at: t.created_at,
      last_used_at: t.last_used_at,
      revoked: t.revoked === 1,
    })),
    meta: { max_tokens: MAX_TOKENS },
  });
}

/**
 * POST /api/v1/tokens —— 用卡密换一个 sk_ 令牌
 * body: { label?: string }
 * 注意：令牌本身不能再换令牌（避免无限套娃），必须用卡密调用。
 */
export async function POST(request: Request) {
  const result = await authenticate(request);
  if (!result.ok) return result.response;

  if (result.auth.token !== null) {
    return apiError(
      400,
      "token_cannot_mint",
      "请用卡密本身创建令牌（sk_ 令牌不能再换新令牌）"
    );
  }

  const limited = await checkRateLimit(`api:token:${result.auth.cardKey}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return apiError(429, "rate_limited", "创建太频繁，请稍后再试", {
      "retry-after": String(Math.ceil((limited.retryAfterMs ?? 3_600_000) / 1000)),
    });
  }

  const body = await readJsonBody(request);
  const label = asString(body?.label, 40);

  const db = await getDb();
  const existing = await db.listApiTokens(result.auth.cardKey);
  const active = existing.filter((t) => t.revoked !== 1).length;
  if (active >= MAX_TOKENS) {
    return apiError(
      409,
      "token_limit",
      `每张卡密最多保留 ${MAX_TOKENS} 个令牌，请先吊销不用的`
    );
  }

  const token = newApiToken();
  const now = nowSec();
  await db.createApiToken({
    token,
    card_key: result.auth.cardKey,
    label,
    created_at: now,
    last_used_at: 0,
    revoked: 0,
  });

  return apiJson(
    { data: { token, label, created_at: now } },
    201
  );
}
