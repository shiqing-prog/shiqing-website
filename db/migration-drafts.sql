-- 2026-10：云端草稿表（登录用户跨设备续写输入框内容）
CREATE TABLE IF NOT EXISTS drafts (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, kind, ref_id)
);
