-- 2026-10：开发者 API（卡密换 token + 按天调用计数），线上执行：
--   npx wrangler d1 execute dsh-bbs --remote --file=db/migration-api.sql

CREATE TABLE IF NOT EXISTS api_tokens (
  token TEXT PRIMARY KEY,
  card_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL DEFAULT 0,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_api_tokens_card ON api_tokens(card_key);

CREATE TABLE IF NOT EXISTS api_usage (
  card_key TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (card_key, day)
);
