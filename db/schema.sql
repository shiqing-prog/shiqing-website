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
  verify_token TEXT,
  verify_token_expires TEXT,
  avatar TEXT,
  reset_token TEXT,
  reset_token_expires TEXT,
  notify_email INTEGER DEFAULT 0,
  -- 卡密整卡兑换得到的账号权益（'free' = 无；时间戳为秒级，0 = 未激活）
  plan TEXT DEFAULT 'free',
  plan_expires_at INTEGER DEFAULT 0,
  plan_quota INTEGER DEFAULT 0,
  plan_used INTEGER DEFAULT 0
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
  created_at TEXT NOT NULL,
  parent_id TEXT,
  reply_to_user_id TEXT
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

-- 站点内容（projects/posts 等 admin 可写的 JSON 块，Workers 无文件系统时的线上存储）
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 分布式限流计数（多 isolate 共享同一 key 的计数；key = 业务前缀 + IP/用户 id）
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

-- 站内私信
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at);

-- 关注关系
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id, created_at);

-- 每日签到
CREATE TABLE IF NOT EXISTS signins (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);

-- 帖子投票（Poll）
CREATE TABLE IF NOT EXISTS polls (
  post_id TEXT PRIMARY KEY,
  options TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS poll_votes (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  choice INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON poll_votes(post_id);

-- 回复点赞
CREATE TABLE IF NOT EXISTS reply_likes (
  reply_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (reply_id, user_id)
);

-- 站内公告
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT
);

-- 心理测评结果（答案为 JSON 数组，可重新评分）
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

-- ============================================================
-- 卡密系统（分发与验证中心 + 整卡兑换到本站账号）
-- 时间字段统一为**秒级** Unix 时间戳；expired_at = 0 表示「未激活」
-- 一张卡密只能二选一：被词库端按次消费（bound_qq），或整卡兑换到账号（bound_user_id）
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_key TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL DEFAULT 'sec',
  plan TEXT NOT NULL DEFAULT 'basic',
  days INTEGER NOT NULL DEFAULT 30,
  quota INTEGER NOT NULL DEFAULT 0,          -- 0 = 不限次数
  used INTEGER NOT NULL DEFAULT 0,
  bound_qq TEXT NOT NULL DEFAULT '',
  bound_user_id TEXT NOT NULL DEFAULT '',    -- 兑换到本站账号（users.id）
  redeemed_at INTEGER NOT NULL DEFAULT 0,    -- 整卡兑换时间；0 = 未兑换
  redeem_token TEXT NOT NULL DEFAULT '',     -- 兑换批次令牌（防并发重复发放）
  expired_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  used_at INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1,         -- 1 = 正常，0 = 已吊销
  remark TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_cards_qq ON cards(bound_qq);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(bound_user_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status, expired_at);

-- 调用审计 + 消费幂等
CREATE TABLE IF NOT EXISTS card_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_key TEXT NOT NULL,
  qq TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,                      -- verify | consume | redeem | generate | revoke
  ip TEXT NOT NULL DEFAULT '',
  request_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_logs_key ON card_logs(card_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_logs_request ON card_logs(request_id);

-- 卡密申请（主页提交 → 管理员审核 → 通过后自动发卡）
CREATE TABLE IF NOT EXISTS card_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,                     -- 申请人（users.id，与博客/论坛同一套账号）
  plan TEXT NOT NULL DEFAULT 'basic',
  days INTEGER NOT NULL DEFAULT 30,
  quota INTEGER NOT NULL DEFAULT 0,          -- 0 = 不限次数
  reason TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',          -- QQ 或邮箱
  status INTEGER NOT NULL DEFAULT 0,         -- 0 = 待审核，1 = 已通过，2 = 已拒绝
  card_key TEXT NOT NULL DEFAULT '',         -- 通过后自动发放的卡密
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT NOT NULL DEFAULT '',      -- 管理员 users.id，或 'token'（脚本调用）
  reviewed_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_requests_user ON card_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_requests_status ON card_requests(status, created_at DESC);

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
