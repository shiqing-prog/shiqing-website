-- 2026-11-06 功能扩展：举报 / 编辑历史 / 稍后读 / 标签订阅
-- 与 src/lib/data.ts 的 D1DataStore 读写对齐；全部 CREATE ... IF NOT EXISTS，可重复执行。

-- 内容举报（帖子 / 回复）。status: 0 待处理，1 已处理，2 已驳回
CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,              -- post | reply
  target_id   TEXT NOT NULL,
  reporter_id TEXT NOT NULL,              -- users.id
  reason      TEXT NOT NULL,              -- spam / abuse / porn / illegal / other
  detail      TEXT NOT NULL DEFAULT '',
  status      INTEGER NOT NULL DEFAULT 0,
  handled_by  TEXT NOT NULL DEFAULT '',
  handled_at  INTEGER NOT NULL DEFAULT 0,
  note        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL
);
-- 用户主页 / 我的帖子按作者查帖，posts 原来只有默认主键与 created_at 相关索引
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
-- 同一用户对同一目标只留一条：重复举报视为更新理由
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique ON reports(reporter_id, target_type, target_id);

-- 帖子编辑历史：每次保存编辑前，把**旧版本**写进来
CREATE TABLE IF NOT EXISTS post_revisions (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  editor_id  TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_post_revisions_post ON post_revisions(post_id, created_at DESC);

-- 稍后读（与 favorites 收藏分开：这里是"先存着待会看"，带已读标记）
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    TEXT NOT NULL,
  post_id    TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at    TEXT,
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, created_at DESC);

-- 标签订阅：关注的标签有新帖时给订阅者发站内通知
CREATE TABLE IF NOT EXISTS tag_follows (
  user_id    TEXT NOT NULL,
  tag        TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_tag_follows_tag ON tag_follows(tag);
CREATE INDEX IF NOT EXISTS idx_tag_follows_user ON tag_follows(user_id, created_at DESC);
