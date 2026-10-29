-- 2026-10：新增短链接表（/s/<code> → 302），此前站点没有短链功能
CREATE TABLE IF NOT EXISTS short_links (
  code TEXT PRIMARY KEY,
  url TEXT NOT NULL,                         -- 归一化后的绝对 URL（仅 http/https）
  created_by TEXT NOT NULL,                  -- users.id
  created_at TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_short_links_owner ON short_links(created_by, created_at DESC);
