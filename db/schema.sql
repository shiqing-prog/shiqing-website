-- BBS 数据库结构（Cloudflare D1 / SQLite）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT DEFAULT 'application/octet-stream',
  uploader_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_post ON replies(post_id, created_at);

-- 种子板块
INSERT OR IGNORE INTO boards (id, slug, name, description, sort_order, created_at) VALUES
  ('b-tech', 'tech', '技术交流', '编程、开发工具与技术讨论', 1, '2026-08-17T00:00:00.000Z'),
  ('b-life', 'life', '生活杂谈', '日常分享、随想与闲聊', 2, '2026-08-17T00:00:00.000Z'),
  ('b-share', 'share', '资源共享', '小文件传输、资料与链接分享', 3, '2026-08-17T00:00:00.000Z');
