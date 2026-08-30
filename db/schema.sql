-- BBS 数据库结构（Cloudflare D1 / SQLite）
-- 与 src/lib/data.ts D1DataStore 的实际读写完全对齐（2026-08-27 修正：
-- 补齐 users.email_verified/verify_token、posts 的 view_count/likes/sticky/attachments/tags、
-- likes/favorites/notifications 三张表，种子板块扩为 6 个）

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  created_at TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0,
  verify_token TEXT
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
  updated_at TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  sticky INTEGER DEFAULT 0,
  attachments TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  type TEXT NOT NULL,
  post_id TEXT,
  reply_id TEXT,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at DESC);

-- 种子板块（与 data.ts SEED_BOARDS 一致，6 个）
INSERT OR IGNORE INTO boards (id, slug, name, description, sort_order, created_at) VALUES
  ('b-frontend', 'frontend', '前端开发', 'HTML/CSS/JS、框架与 UI', 1, '2026-08-17T00:00:00.000Z'),
  ('b-backend', 'backend', '后端开发', '服务端、数据库与 API', 2, '2026-08-17T00:00:00.000Z'),
  ('b-tech', 'tech', '技术综合', '编程、开发工具与技术讨论', 3, '2026-08-17T00:00:00.000Z'),
  ('b-life', 'life', '生活杂谈', '日常分享、随想与闲聊', 4, '2026-08-17T00:00:00.000Z'),
  ('b-gaming', 'gaming', '游戏交流', '游戏讨论、开服与联机', 5, '2026-08-17T00:00:00.000Z'),
  ('b-share', 'share', '资源共享', '小文件传输、资料与链接分享', 6, '2026-08-17T00:00:00.000Z');
