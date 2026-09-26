CREATE TABLE IF NOT EXISTS psych_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scale_slug TEXT NOT NULL,
  total INTEGER NOT NULL,
  max INTEGER NOT NULL,
  level TEXT NOT NULL,
  level_key TEXT NOT NULL,
  type_code TEXT,
  answers TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_psych_results_user ON psych_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psych_results_scale ON psych_results(scale_slug, created_at DESC);
