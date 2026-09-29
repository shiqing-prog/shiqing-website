import { promises as fs } from "node:fs";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  User,
  Session,
  Board,
  BbsPost,
  Reply,
  FileRecord,
  Notification,
  Message,
  Conversation,
  PollResult,
  Announcement,
  PsychResultRecord,
  CardRecord,
  CardLogRecord,
  CardStats,
  CardRequest,
} from "./types";

/* ================= 接口定义 ================= */

export interface DataStore {
  createUser(u: User): Promise<void>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUserProfile(
    id: string,
    patch: { nickname?: string; bio?: string; avatar?: string | null }
  ): Promise<User | null>;
  updateUserPassword(id: string, passwordHash: string): Promise<boolean>;
  setUserVerifyToken(id: string, token: string | null, expiresAt: string | null): Promise<void>;
  getUserByVerifyToken(token: string): Promise<User | null>;
  markEmailVerified(id: string): Promise<void>;
  listUsers(): Promise<User[]>;

  createSession(s: Session): Promise<void>;
  getSession(token: string): Promise<Session | null>;
  deleteSession(token: string): Promise<void>;

  listBoards(): Promise<Board[]>;
  getBoard(id: string): Promise<Board | null>;
  getBoardBySlug(slug: string): Promise<Board | null>;

  listPosts(opts: {
    boardId?: string;
    authorId?: string;
    q?: string;
    tag?: string;
    sort?: "latest" | "hot";
    page?: number;
    pageSize?: number;
  }): Promise<{ posts: BbsPost[]; total: number }>;
  getPost(id: string): Promise<BbsPost | null>;
  incrementPostViews(id: string): Promise<void>;
  createPost(p: BbsPost): Promise<void>;
  updatePost(id: string, patch: { title?: string; content?: string }): Promise<BbsPost | null>;
  setPostSticky(id: string, sticky: boolean): Promise<BbsPost | null>;
  deletePost(id: string): Promise<void>;

  listReplies(postId: string): Promise<Reply[]>;
  listRepliesPage(postId: string, page: number, pageSize: number): Promise<{ replies: Reply[]; total: number }>;
  listChildReplies(postId: string): Promise<Reply[]>;
  /** 回复点赞开关 */
  toggleReplyLike(
    replyId: string,
    userId: string
  ): Promise<{ liked: boolean; likes: number }>;
  /** 我在这些回复中点过赞的 id 列表 */
  listReplyLikesByUser(userId: string, replyIds: string[]): Promise<string[]>;
  /** 用户积分与活跃数据 */
  getUserPoints(userId: string): Promise<{
    points: number;
    posts: number;
    replies: number;
    signins: number;
    likesReceived: number;
  }>;
  createReply(r: Reply): Promise<void>;
  getReply(id: string): Promise<Reply | null>;
  updateReply(id: string, patch: { content: string }): Promise<Reply | null>;
  deleteReply(id: string): Promise<void>;

  toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likes: number }>;
  isPostLiked(postId: string, userId: string): Promise<boolean>;

  toggleFavorite(postId: string, userId: string): Promise<{ favorited: boolean; count: number }>;
  isPostFavorited(postId: string, userId: string): Promise<boolean>;
  listFavoritePosts(userId: string): Promise<BbsPost[]>;

  createNotification(n: Notification): Promise<void>;
  listNotifications(userId: string, limit?: number): Promise<Notification[]>;
  unreadNotificationCount(userId: string): Promise<number>;
  markNotificationsRead(userId: string): Promise<void>;

  listFiles(opts: { page?: number; pageSize?: number }): Promise<{
    files: FileRecord[];
    total: number;
  }>;
  getFile(id: string): Promise<FileRecord | null>;
  getFilesByIds(ids: string[]): Promise<FileRecord[]>;
  createFile(f: FileRecord): Promise<void>;
  deleteFile(id: string): Promise<void>;
  /** 统计某文件被多少帖子附件/用户头像引用（删除文件前的安全检查） */
  countFileReferences(fileId: string): Promise<number>;

  createMessage(m: Message): Promise<void>;
  listConversations(userId: string): Promise<Conversation[]>;
  listMessages(userId: string, otherId: string): Promise<Message[]>;
  markConversationRead(userId: string, otherId: string): Promise<void>;
  unreadMessageCount(userId: string): Promise<number>;

  toggleFollow(
    followerId: string,
    followeeId: string
  ): Promise<{ following: boolean; followers: number }>;
  isFollowing(followerId: string, followeeId: string): Promise<boolean>;
  countFollowers(userId: string): Promise<number>;
  countFollowing(userId: string): Promise<number>;
  /** 我关注的人的最新帖子 */
  listFollowingPosts(
    followerId: string,
    opts: { page?: number; pageSize?: number }
  ): Promise<{ posts: BbsPost[]; total: number }>;
  /** 粉丝列表 */
  listFollowers(userId: string): Promise<UserBrief[]>;
  /** 关注列表 */
  listFollowing(userId: string): Promise<UserBrief[]>;
  /** 按昵称精确查用户（@提及用） */
  getUserByNickname(nickname: string): Promise<User | null>;
  /** 站点统计 */
  getSiteStats(): Promise<{
    users: number;
    posts: number;
    replies: number;
    files: number;
    messages: number;
    signins: number;
  }>;

  signToday(userId: string): Promise<{ ok: boolean; already: boolean; streak: number }>;
  getSignStats(userId: string): Promise<{ today: boolean; streak: number; total: number }>;
  /** 某用户最近 N 天的签到日期（YYYY-MM-DD，升序），用于签到热力图 */
  listSigninDays(userId: string, days?: number): Promise<string[]>;
  /** 全站标签及出现次数（按次数降序） */
  listTags(limit?: number): Promise<{ tag: string; count: number }[]>;
  /** 累计签到榜 Top10 */
  signinLeaderboard(limit?: number): Promise<
    { userId: string; nickname: string; avatar: string | null; total: number }[]
  >;

  createPoll(postId: string, options: string[]): Promise<void>;
  getPollResult(postId: string, userId: string): Promise<PollResult | null>;
  castPollVote(
    postId: string,
    userId: string,
    choice: number
  ): Promise<{ ok: boolean; already: boolean; choice: number } | null>;

  /** 密码重置 token 写入/清除 */
  setUserResetToken(
    id: string,
    token: string | null,
    expiresAt: string | null
  ): Promise<void>;
  getUserByResetToken(token: string): Promise<User | null>;
  /** 清空某用户全部会话（重置密码后强制重新登录） */
  deleteUserSessions(userId: string): Promise<void>;
  /** 邮件通知开关 */
  setNotifyEmail(userId: string, enabled: boolean): Promise<void>;

  /** 站内公告 */
  listAnnouncements(activeOnly?: boolean): Promise<Announcement[]>;
  createAnnouncement(a: Announcement): Promise<void>;
  deleteAnnouncement(id: string): Promise<void>;

  /** 心理测评记录 */
  createPsychResult(r: PsychResultRecord): Promise<void>;
  listPsychResults(userId: string, limit?: number): Promise<PsychResultRecord[]>;
  /** 某量表全站参与人次（不传则统计全部） */
  countPsychResults(scaleSlug?: string): Promise<number>;
  /** 各量表参与人次（一次查询，列表页用） */
  psychCountsByScale(): Promise<Record<string, number>>;
  /** 删除自己的测评记录（返回是否删除成功） */
  deletePsychResult(id: string, userId: string): Promise<boolean>;

  /* ---------- 卡密系统 ---------- */
  getCardByKey(key: string): Promise<CardRecord | null>;
  /** 批量插入（重复 key 忽略），返回实际插入成功的 key */
  insertCards(rows: CardRecord[]): Promise<string[]>;
  listCards(opts: {
    page?: number;
    pageSize?: number;
    status?: number;
    q?: string;
  }): Promise<{ rows: CardRecord[]; total: number }>;
  /** 吊销，返回受影响行数 */
  revokeCard(key: string): Promise<number>;
  /** 原子消费一次（并发安全）；首次消费写入 bound_qq 与 expired_at */
  consumeCard(key: string, qq: string, now: number): Promise<boolean>;
  cardStats(): Promise<CardStats>;
  createCardLog(log: CardLogRecord): Promise<void>;
  /** 按 request_id 查消费日志（幂等去重） */
  getCardLogByRequestId(requestId: string): Promise<CardLogRecord | null>;
  /** 整卡兑换到账号（原子：要求未消费、未兑换、未绑定任何一方），返回是否成功 */
  redeemCard(key: string, userId: string, now: number): Promise<boolean>;
  /** 该账号兑换过的卡密 */
  listRedeemedCards(userId: string): Promise<CardRecord[]>;
  /** 读取账号权益原始字段 */
  getUserPlanRaw(userId: string): Promise<{
    plan: string;
    plan_expires_at: number;
    plan_quota: number;
    plan_used: number;
  } | null>;
  /** 写回账号权益（原子 UPDATE） */
  setUserPlan(
    userId: string,
    plan: { plan: string; expiresAt: number; quota: number; used: number }
  ): Promise<void>;

  /* ---------- 卡密申请 ---------- */
  /** 提交申请 */
  createCardRequest(r: CardRequest): Promise<void>;
  /** 某用户的申请列表（最新在前） */
  listCardRequestsByUser(userId: string, limit?: number): Promise<CardRequest[]>;
  /** 审核用分页列表（可按状态过滤） */
  listCardRequests(opts: {
    page?: number;
    pageSize?: number;
    status?: number;
  }): Promise<{ rows: CardRequest[]; total: number }>;
  getCardRequest(id: number): Promise<CardRequest | null>;
  /** 该用户待审核的申请数（用于防重复提交） */
  countPendingCardRequests(userId: string): Promise<number>;
  /** 该用户最近 N 秒内提交的申请数（用于限流） */
  countRecentCardRequests(userId: string, sinceSec: number): Promise<number>;
  /** 审核（原子：仅当仍为待审核时生效） */
  reviewCardRequest(
    id: number,
    patch: {
      status: 1 | 2;
      cardKey: string;
      note: string;
      reviewerId: string;
      reviewedAt: number;
    }
  ): Promise<boolean>;
}

/* ================= 运行时选择 ================= */

/** 精简用户信息（粉丝/关注列表用） */
export interface UserBrief {
  id: string;
  nickname: string;
  avatar: string | null;
  bio: string;
  created_at: string;
}

let cached: DataStore | null = null;

export async function getDb(): Promise<DataStore> {
  if (cached) return cached;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as unknown as { dsh_bbs?: D1Database }).dsh_bbs;
    if (db) {
      cached = new D1DataStore(db);
      return cached;
    }
  } catch {
    /* 非 Cloudflare 环境（本地 next dev / 构建） */
  }
  cached = new JsonDataStore();
  return cached;
}

/* ================= D1 实现（线上） ================= */

type D1Result = { meta: { changes: number; last_row_id: number } };

type D1Statement = {
  bind(...args: unknown[]): D1Statement;
  all(): Promise<{ results: unknown[] }>;
  first(): Promise<unknown>;
  run(): Promise<D1Result>;
};

type D1Database = {
  prepare(sql: string): D1Statement;
  /** D1 批量执行（一次提交，语句级原子） */
  batch(statements: D1Statement[]): Promise<D1Result[]>;
};

class D1DataStore implements DataStore {
  constructor(private db: D1Database) {}

  async createUser(u: User): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO users (id, email, password_hash, nickname, bio, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(u.id, u.email, u.password_hash, u.nickname, u.bio, u.role, u.created_at)
      .run();
  }
  async getUserByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();
    return (row as User) ?? null;
  }
  async getUserById(id: string): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(id)
      .first();
    return (row as User) ?? null;
  }
  async listUsers(): Promise<User[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM users ORDER BY created_at DESC")
      .all();
    return results as User[];
  }
  async updateUserProfile(
    id: string,
    patch: { nickname?: string; bio?: string; avatar?: string | null }
  ): Promise<User | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.nickname !== undefined) {
      sets.push("nickname = ?");
      params.push(patch.nickname);
    }
    if (patch.bio !== undefined) {
      sets.push("bio = ?");
      params.push(patch.bio);
    }
    if (patch.avatar !== undefined) {
      sets.push("avatar = ?");
      params.push(patch.avatar);
    }
    if (sets.length) {
      params.push(id);
      await this.db
        .prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...params)
        .run();
    }
    return this.getUserById(id);
  }
  async updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
    const res = await this.db
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(passwordHash, id)
      .run();
    return res.meta.changes > 0;
  }
  async setUserVerifyToken(
    id: string,
    token: string | null,
    expiresAt: string | null
  ): Promise<void> {
    await this.db
      .prepare("UPDATE users SET verify_token = ?, verify_token_expires = ? WHERE id = ?")
      .bind(token, expiresAt, id)
      .run();
  }
  async getUserByVerifyToken(token: string): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT * FROM users WHERE verify_token = ?")
      .bind(token)
      .first();
    return (row as User) ?? null;
  }
  async markEmailVerified(id: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE users SET email_verified = 1, verify_token = NULL, verify_token_expires = NULL WHERE id = ?"
      )
      .bind(id)
      .run();
  }

  async createSession(s: Session): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
      )
      .bind(s.token, s.user_id, s.expires_at, s.created_at)
      .run();
  }
  async getSession(token: string): Promise<Session | null> {
    const row = await this.db
      .prepare("SELECT * FROM sessions WHERE token = ?")
      .bind(token)
      .first();
    return (row as Session) ?? null;
  }
  async deleteSession(token: string): Promise<void> {
    await this.db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }

  async listBoards(): Promise<Board[]> {
    const { results } = await this.db
      .prepare(
        `SELECT b.*, (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id) AS post_count
         FROM boards b ORDER BY b.sort_order ASC`
      )
      .all();
    return results as Board[];
  }
  async getBoard(id: string): Promise<Board | null> {
    const row = await this.db
      .prepare("SELECT * FROM boards WHERE id = ?")
      .bind(id)
      .first();
    return (row as Board) ?? null;
  }
  async getBoardBySlug(slug: string): Promise<Board | null> {
    const row = await this.db
      .prepare("SELECT * FROM boards WHERE slug = ?")
      .bind(slug)
      .first();
    return (row as Board) ?? null;
  }

  async listPosts(opts: {
    boardId?: string;
    authorId?: string;
    q?: string;
    tag?: string;
    sort?: "latest" | "hot";
    page?: number;
    pageSize?: number;
  }): Promise<{ posts: BbsPost[]; total: number }> {
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
    const offset = (page - 1) * pageSize;

    const conds: string[] = [];
    const params: unknown[] = [];
    if (opts.boardId) {
      conds.push("p.board_id = ?");
      params.push(opts.boardId);
    }
    if (opts.authorId) {
      conds.push("p.author_id = ?");
      params.push(opts.authorId);
    }
    if (opts.q) {
      // D1 的 LIKE 模式上限 50 字节，超长会直接报错；同时转义通配符，保证与 JSON 实现
      // 的「字面量子串匹配」语义一致（否则搜 % 会命中全站）
      conds.push("(p.title LIKE ? ESCAPE '\\' OR p.content LIKE ? ESCAPE '\\')");
      const like = `%${escapeLike(truncateBytes(opts.q, 40))}%`;
      params.push(like, like);
    }
    if (opts.tag) {
      // 与 JSON 实现的精确匹配保持一致：转义 LIKE 通配符，按 JSON 数组元素精确匹配
      conds.push("p.tags LIKE ? ESCAPE '\\'");
      params.push(`%"${escapeLike(truncateBytes(opts.tag, 40))}"%`);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const orderBy =
      opts.sort === "hot"
        ? "ORDER BY p.sticky DESC, p.likes DESC, p.created_at DESC"
        : "ORDER BY p.sticky DESC, p.created_at DESC";

    const totalRow = await this.db
      .prepare(`SELECT COUNT(*) AS n FROM posts p ${where}`)
      .bind(...params)
      .first();
    const total = Number((totalRow as { n: number }).n);

    const { results } = await this.db
      .prepare(
        `SELECT p.*, u.nickname AS author_nickname, u.avatar AS author_avatar,
           (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id) AS reply_count
         FROM posts p JOIN users u ON u.id = p.author_id
         ${where}
         ${orderBy} LIMIT ? OFFSET ?`
      )
      .bind(...params, pageSize, offset)
      .all();
    return {
      posts: (results as BbsPost[]).map(parseAttachments),
      total,
    };
  }
  async getPost(id: string): Promise<BbsPost | null> {
    const row = await this.db
      .prepare(
        `SELECT p.*, u.nickname AS author_nickname, u.avatar AS author_avatar,
           (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id) AS reply_count
         FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`
      )
      .bind(id)
      .first();
    const post = row ? parseAttachments(row as BbsPost) : null;
    return post;
  }
  async incrementPostViews(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?")
      .bind(id)
      .run();
  }
  async createPost(p: BbsPost): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO posts (id, board_id, author_id, title, content, created_at, updated_at, attachments, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        p.id,
        p.board_id,
        p.author_id,
        p.title,
        p.content,
        p.created_at,
        p.updated_at,
        JSON.stringify(p.attachments ?? []),
        JSON.stringify(p.tags ?? [])
      )
      .run();
  }
  async updatePost(
    id: string,
    patch: { title?: string; content?: string }
  ): Promise<BbsPost | null> {
    const updatedAt = new Date().toISOString();
    if (patch.title !== undefined && patch.content !== undefined) {
      await this.db
        .prepare("UPDATE posts SET title = ?, content = ?, updated_at = ? WHERE id = ?")
        .bind(patch.title, patch.content, updatedAt, id)
        .run();
    } else if (patch.title !== undefined) {
      await this.db
        .prepare("UPDATE posts SET title = ?, updated_at = ? WHERE id = ?")
        .bind(patch.title, updatedAt, id)
        .run();
    } else if (patch.content !== undefined) {
      await this.db
        .prepare("UPDATE posts SET content = ?, updated_at = ? WHERE id = ?")
        .bind(patch.content, updatedAt, id)
        .run();
    }
    return this.getPost(id);
  }
  async setPostSticky(
    id: string,
    sticky: boolean
  ): Promise<BbsPost | null> {
    await this.db
      .prepare("UPDATE posts SET sticky = ? WHERE id = ?")
      .bind(sticky ? 1 : 0, id)
      .run();
    return this.getPost(id);
  }
  async deletePost(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
    await this.db
      .prepare("DELETE FROM reply_likes WHERE reply_id IN (SELECT id FROM replies WHERE post_id = ?)")
      .bind(id)
      .run();
    await this.db.prepare("DELETE FROM replies WHERE post_id = ?").bind(id).run();
    await this.db.prepare("DELETE FROM likes WHERE post_id = ?").bind(id).run();
    await this.db.prepare("DELETE FROM favorites WHERE post_id = ?").bind(id).run();
    await this.db.prepare("DELETE FROM notifications WHERE post_id = ?").bind(id).run();
    await this.db.prepare("DELETE FROM polls WHERE post_id = ?").bind(id).run();
    await this.db.prepare("DELETE FROM poll_votes WHERE post_id = ?").bind(id).run();
  }

  async listReplies(postId: string): Promise<Reply[]> {
    const { results } = await this.db
      .prepare(
        `SELECT r.*, u.nickname AS author_nickname, u.avatar AS author_avatar,
           (SELECT COUNT(*) FROM reply_likes rl WHERE rl.reply_id = r.id) AS likes
         FROM replies r JOIN users u ON u.id = r.author_id
         WHERE r.post_id = ? ORDER BY r.created_at ASC`
      )
      .bind(postId)
      .all();
    return results as Reply[];
  }
  async listRepliesPage(
    postId: string,
    page: number,
    pageSize: number
  ): Promise<{ replies: Reply[]; total: number }> {
    const p = Math.max(page, 1);
    const size = Math.min(Math.max(pageSize, 1), 100);
    // 分页仅针对顶层回复（楼中楼子回复由 listChildReplies 一次取回）
    const totalRow = await this.db
      .prepare("SELECT COUNT(*) AS n FROM replies WHERE post_id = ? AND parent_id IS NULL")
      .bind(postId)
      .first();
    const total = Number((totalRow as { n: number }).n);
    const { results } = await this.db
      .prepare(
        `SELECT r.*, u.nickname AS author_nickname, u.avatar AS author_avatar,
           (SELECT COUNT(*) FROM reply_likes rl WHERE rl.reply_id = r.id) AS likes
         FROM replies r JOIN users u ON u.id = r.author_id
         WHERE r.post_id = ? AND r.parent_id IS NULL ORDER BY r.created_at ASC LIMIT ? OFFSET ?`
      )
      .bind(postId, size, (p - 1) * size)
      .all();
    return { replies: results as Reply[], total };
  }
  /** 楼中楼：某帖子下全部子回复（时间正序），供详情页组装回复树 */
  async listChildReplies(postId: string): Promise<Reply[]> {
    const { results } = await this.db
      .prepare(
        `SELECT r.*, u.nickname AS author_nickname, u.avatar AS author_avatar,
           (SELECT COUNT(*) FROM reply_likes rl WHERE rl.reply_id = r.id) AS likes,
           u2.nickname AS reply_to_nickname
         FROM replies r
         JOIN users u ON u.id = r.author_id
         LEFT JOIN users u2 ON u2.id = r.reply_to_user_id
         WHERE r.post_id = ? AND r.parent_id IS NOT NULL ORDER BY r.created_at ASC`
      )
      .bind(postId)
      .all();
    return results as Reply[];
  }
  async createReply(r: Reply): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO replies (id, post_id, author_id, content, created_at, parent_id, reply_to_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        r.id,
        r.post_id,
        r.author_id,
        r.content,
        r.created_at,
        r.parent_id ?? null,
        r.reply_to_user_id ?? null
      )
      .run();
  }
  async getReply(id: string): Promise<Reply | null> {
    const row = await this.db
      .prepare("SELECT * FROM replies WHERE id = ?")
      .bind(id)
      .first();
    return (row as Reply) ?? null;
  }
  async updateReply(
    id: string,
    patch: { content: string }
  ): Promise<Reply | null> {
    await this.db
      .prepare("UPDATE replies SET content = ? WHERE id = ?")
      .bind(patch.content, id)
      .run();
    return this.getReply(id);
  }
  async deleteReply(id: string): Promise<void> {
    // 连子回复一起删除（否则子回复会变成 parent_id 悬空的孤儿，界面上再也看不到）
    // 先清理自身与子回复的点赞记录
    await this.db
      .prepare(
        "DELETE FROM reply_likes WHERE reply_id = ? OR reply_id IN (SELECT id FROM replies WHERE parent_id = ?)"
      )
      .bind(id, id)
      .run();
    await this.db.prepare("DELETE FROM replies WHERE parent_id = ?").bind(id).run();
    await this.db.prepare("DELETE FROM replies WHERE id = ?").bind(id).run();
  }

  async toggleLike(
    postId: string,
    userId: string
  ): Promise<{ liked: boolean; likes: number }> {
    const existing = await this.db
      .prepare("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .first();
    if (existing) {
      await this.db
        .prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?")
        .bind(postId, userId)
        .run();
      await this.db
        .prepare("UPDATE posts SET likes = MAX(likes - 1, 0) WHERE id = ?")
        .bind(postId)
        .run();
    } else {
      await this.db
        .prepare("INSERT INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?)")
        .bind(postId, userId, new Date().toISOString())
        .run();
      await this.db
        .prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?")
        .bind(postId)
        .run();
    }
    const row = await this.db
      .prepare("SELECT likes FROM posts WHERE id = ?")
      .bind(postId)
      .first();
    const likes = Number((row as { likes: number }).likes ?? 0);
    return { liked: !existing, likes };
  }
  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .first();
    return Boolean(row);
  }

  async toggleFavorite(
    postId: string,
    userId: string
  ): Promise<{ favorited: boolean; count: number }> {
    const existing = await this.db
      .prepare("SELECT 1 FROM favorites WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .first();
    if (existing) {
      await this.db
        .prepare("DELETE FROM favorites WHERE post_id = ? AND user_id = ?")
        .bind(postId, userId)
        .run();
    } else {
      await this.db
        .prepare("INSERT INTO favorites (post_id, user_id, created_at) VALUES (?, ?, ?)")
        .bind(postId, userId, new Date().toISOString())
        .run();
    }
    const row = await this.db
      .prepare("SELECT COUNT(*) AS n FROM favorites WHERE post_id = ?")
      .bind(postId)
      .first();
    const count = Number((row as { n: number }).n);
    return { favorited: !existing, count };
  }
  async isPostFavorited(postId: string, userId: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT 1 FROM favorites WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .first();
    return Boolean(row);
  }
  async listFavoritePosts(userId: string): Promise<BbsPost[]> {
    const { results } = await this.db
      .prepare(
        `SELECT p.*, u.nickname AS author_nickname, u.avatar AS author_avatar,
           (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id) AS reply_count
         FROM posts p JOIN favorites f ON f.post_id = p.id
         JOIN users u ON u.id = p.author_id
         WHERE f.user_id = ? ORDER BY f.created_at DESC`
      )
      .bind(userId)
      .all();
    return (results as BbsPost[]).map(parseAttachments);
  }

  async createNotification(n: Notification): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO notifications (id, user_id, actor_id, type, post_id, reply_id, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        n.id,
        n.user_id,
        n.actor_id,
        n.type,
        n.post_id,
        n.reply_id,
        n.content,
        n.is_read,
        n.created_at
      )
      .run();
  }
  async listNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const { results } = await this.db
      .prepare(
        `SELECT n.*, u.nickname AS actor_nickname
         FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
         WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`
      )
      .bind(userId, limit)
      .all();
    // LEFT JOIN：actor 用户被删除后通知仍保留，昵称回退为"已注销"
    return (results as Notification[]).map((n) => ({
      ...n,
      actor_nickname: n.actor_nickname ?? "已注销",
    }));
  }
  async unreadNotificationCount(userId: string): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0"
      )
      .bind(userId)
      .first();
    return Number((row as { n: number }).n);
  }
  async markNotificationsRead(userId: string): Promise<void> {
    await this.db
      .prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0")
      .bind(userId)
      .run();
  }

  async listFiles(opts: {
    page?: number;
    pageSize?: number;
  }): Promise<{ files: FileRecord[]; total: number }> {
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
    const offset = (page - 1) * pageSize;
    const totalRow = await this.db
      .prepare("SELECT COUNT(*) AS n FROM files")
      .first();
    const total = Number((totalRow as { n: number }).n);
    const { results } = await this.db
      .prepare(
        `SELECT f.*, u.nickname AS uploader_nickname
         FROM files f LEFT JOIN users u ON u.id = f.uploader_id
         ORDER BY f.created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(pageSize, offset)
      .all();
    return { files: results as FileRecord[], total };
  }
  async getFile(id: string): Promise<FileRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM files WHERE id = ?")
      .bind(id)
      .first();
    return (row as FileRecord) ?? null;
  }
  async getFilesByIds(ids: string[]): Promise<FileRecord[]> {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(",");
    const { results } = await this.db
      .prepare(`SELECT * FROM files WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all();
    return results as FileRecord[];
  }
  async createFile(f: FileRecord): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO files (id, filename, size, mime, uploader_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(f.id, f.filename, f.size, f.mime, f.uploader_id, f.created_at)
      .run();
  }
  async deleteFile(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM files WHERE id = ?").bind(id).run();
  }
  async countFileReferences(fileId: string): Promise<number> {
    // posts.attachments 是 JSON 字符串数组，用带引号的精确子串匹配
    const pattern = `%"${escapeLike(fileId)}"%`;
    const [postRow, avatarRow] = await Promise.all([
      this.db
        .prepare("SELECT COUNT(*) AS n FROM posts WHERE attachments LIKE ? ESCAPE '\\'")
        .bind(pattern)
        .first(),
      this.db
        .prepare("SELECT COUNT(*) AS n FROM users WHERE avatar = ?")
        .bind(fileId)
        .first(),
    ]);
    return (
      Number((postRow as { n: number } | null)?.n ?? 0) +
      Number((avatarRow as { n: number } | null)?.n ?? 0)
    );
  }

  /* ---------- 私信 ---------- */
  async createMessage(m: Message): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO messages (id, sender_id, receiver_id, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at)
      .run();
  }
  async listConversations(userId: string): Promise<Conversation[]> {
    // 直接按「每个联系人最近一条消息」取，避免先取 500 条再分组导致老会话整条消失
    const { results } = await this.db
      .prepare(
        `SELECT m.* FROM messages m
           JOIN (
             SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other,
                    MAX(created_at) AS mx
               FROM messages
              WHERE sender_id = ? OR receiver_id = ?
              GROUP BY other
           ) t
             ON t.mx = m.created_at
            AND (t.other = m.sender_id OR t.other = m.receiver_id)
          ORDER BY m.created_at DESC`
      )
      .bind(userId, userId, userId)
      .all();
    const rows = results as Message[];
    // 未读数按对方分组（精确统计全部未读）
    const unreadRow = await this.db
      .prepare(
        "SELECT sender_id, COUNT(*) AS n FROM messages WHERE receiver_id = ? AND is_read = 0 GROUP BY sender_id"
      )
      .bind(userId)
      .all();
    const unreadMap = new Map<string, number>();
    for (const r of unreadRow.results as { sender_id: string; n: number }[]) {
      unreadMap.set(r.sender_id, Number(r.n));
    }
    // 按对方分组，取每组最新一条
    const lastByOther = new Map<string, Message>();
    for (const m of rows) {
      const other = m.sender_id === userId ? m.receiver_id : m.sender_id;
      if (!lastByOther.has(other)) lastByOther.set(other, m);
    }
    // 对方昵称
    const ids = [...lastByOther.keys()];
    const nickMap = new Map<string, string>();
    const avatarMap = new Map<string, string | null>();
    if (ids.length) {
      // D1 单语句绑定参数上限 100，联系人较多时分片查询
      const CHUNK = 80;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const ph = slice.map(() => "?").join(",");
        const { results: users } = await this.db
          .prepare(`SELECT id, nickname, avatar FROM users WHERE id IN (${ph})`)
          .bind(...slice)
          .all();
        for (const u of users as {
          id: string;
          nickname: string;
          avatar?: string | null;
        }[]) {
          nickMap.set(u.id, u.nickname);
          avatarMap.set(u.id, u.avatar ?? null);
        }
      }
    }
    const convs: Conversation[] = [...lastByOther.entries()].map(([uid, last]) => ({
      userId: uid,
      nickname: nickMap.get(uid) ?? "已注销",
      avatar: avatarMap.get(uid) ?? null,
      lastContent: last.content,
      lastAt: last.created_at,
      unread: unreadMap.get(uid) ?? 0,
    }));
    return convs.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }
  async listMessages(userId: string, otherId: string): Promise<Message[]> {
    const { results } = await this.db
      .prepare(
        `SELECT m.*, u.nickname AS sender_nickname
         FROM messages m JOIN users u ON u.id = m.sender_id
         WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
         ORDER BY m.created_at DESC LIMIT 200`
      )
      .bind(userId, otherId, otherId, userId)
      .all();
    return (results as Message[]).reverse();
  }
  async markConversationRead(userId: string, otherId: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0"
      )
      .bind(userId, otherId)
      .run();
  }
  async unreadMessageCount(userId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS n FROM messages WHERE receiver_id = ? AND is_read = 0")
      .bind(userId)
      .first();
    return Number((row as { n: number }).n ?? 0);
  }

  /* ---------- 关注 ---------- */
  async toggleFollow(
    followerId: string,
    followeeId: string
  ): Promise<{ following: boolean; followers: number }> {
    const existing = await this.db
      .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?")
      .bind(followerId, followeeId)
      .first();
    if (existing) {
      await this.db
        .prepare("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?")
        .bind(followerId, followeeId)
        .run();
    } else {
      await this.db
        .prepare("INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)")
        .bind(followerId, followeeId, new Date().toISOString())
        .run();
    }
    const row = await this.db
      .prepare("SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?")
      .bind(followeeId)
      .first();
    return {
      following: !existing,
      followers: Number((row as { n: number }).n ?? 0),
    };
  }
  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?")
      .bind(followerId, followeeId)
      .first();
    return Boolean(row);
  }
  async countFollowers(userId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?")
      .bind(userId)
      .first();
    return Number((row as { n: number }).n ?? 0);
  }
  async countFollowing(userId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?")
      .bind(userId)
      .first();
    return Number((row as { n: number }).n ?? 0);
  }
  async listFollowingPosts(
    followerId: string,
    opts: { page?: number; pageSize?: number }
  ): Promise<{ posts: BbsPost[]; total: number }> {
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
    const totalRow = await this.db
      .prepare(
        `SELECT COUNT(*) AS n FROM posts p
         JOIN follows f ON f.followee_id = p.author_id AND f.follower_id = ?`
      )
      .bind(followerId)
      .first();
    const total = Number((totalRow as { n: number }).n ?? 0);
    const { results } = await this.db
      .prepare(
        `SELECT p.*, u.nickname AS author_nickname, u.avatar AS author_avatar,
           (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id) AS reply_count
         FROM posts p
         JOIN follows f ON f.followee_id = p.author_id AND f.follower_id = ?
         JOIN users u ON u.id = p.author_id
         ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(followerId, pageSize, (page - 1) * pageSize)
      .all();
    return {
      posts: (results as BbsPost[]).map(parseAttachments),
      total,
    };
  }
  async listFollowers(userId: string): Promise<UserBrief[]> {
    const { results } = await this.db
      .prepare(
        `SELECT u.id, u.nickname, u.avatar, u.bio, u.created_at
         FROM follows f JOIN users u ON u.id = f.follower_id
         WHERE f.followee_id = ? ORDER BY f.created_at DESC LIMIT 200`
      )
      .bind(userId)
      .all();
    return (results as UserBrief[]).map((u) => ({ ...u, avatar: u.avatar ?? null }));
  }
  async listFollowing(userId: string): Promise<UserBrief[]> {
    const { results } = await this.db
      .prepare(
        `SELECT u.id, u.nickname, u.avatar, u.bio, u.created_at
         FROM follows f JOIN users u ON u.id = f.followee_id
         WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 200`
      )
      .bind(userId)
      .all();
    return (results as UserBrief[]).map((u) => ({ ...u, avatar: u.avatar ?? null }));
  }
  async getUserByNickname(nickname: string): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT * FROM users WHERE nickname = ? LIMIT 1")
      .bind(nickname)
      .first();
    return (row as User) ?? null;
  }
  async getSiteStats(): Promise<{
    users: number;
    posts: number;
    replies: number;
    files: number;
    messages: number;
    signins: number;
  }> {
    const one = async (sql: string): Promise<number> => {
      const row = await this.db.prepare(sql).first();
      return Number((row as { n: number }).n ?? 0);
    };
    const [users, posts, replies, files, messages, signins] = await Promise.all([
      one("SELECT COUNT(*) AS n FROM users"),
      one("SELECT COUNT(*) AS n FROM posts"),
      one("SELECT COUNT(*) AS n FROM replies"),
      one("SELECT COUNT(*) AS n FROM files"),
      one("SELECT COUNT(*) AS n FROM messages"),
      one("SELECT COUNT(*) AS n FROM signins"),
    ]);
    return { users, posts, replies, files, messages, signins };
  }

  /* ---------- 签到（Asia/Shanghai 时区） ---------- */
  async signToday(
    userId: string
  ): Promise<{ ok: boolean; already: boolean; streak: number }> {
    const day = shanghaiDay(new Date());
    const existing = await this.db
      .prepare("SELECT 1 FROM signins WHERE user_id = ? AND day = ?")
      .bind(userId, day)
      .first();
    const already = Boolean(existing);
    if (!already) {
      await this.db
        .prepare("INSERT INTO signins (user_id, day, created_at) VALUES (?, ?, ?)")
        .bind(userId, day, new Date().toISOString())
        .run();
    }
    const { results } = await this.db
      .prepare("SELECT day FROM signins WHERE user_id = ?")
      .bind(userId)
      .all();
    const days = (results as { day: string }[]).map((r) => r.day);
    return { ok: !already, already, streak: calcStreak(days) };
  }
  async getSignStats(
    userId: string
  ): Promise<{ today: boolean; streak: number; total: number }> {
    const { results } = await this.db
      .prepare("SELECT day FROM signins WHERE user_id = ?")
      .bind(userId)
      .all();
    const days = (results as { day: string }[]).map((r) => r.day);
    return {
      today: days.includes(shanghaiDay(new Date())),
      streak: calcStreak(days),
      total: days.length,
    };
  }
  async listSigninDays(userId: string, days = 120): Promise<string[]> {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { results } = await this.db
      .prepare("SELECT day FROM signins WHERE user_id = ? AND day >= ? ORDER BY day")
      .bind(userId, since)
      .all();
    return (results as { day: string }[]).map((r) => r.day);
  }
  async listTags(limit = 60): Promise<{ tag: string; count: number }[]> {
    const { results } = await this.db.prepare("SELECT tags FROM posts").all();
    const counts = new Map<string, number>();
    for (const row of results as { tags: string | null }[]) {
      for (const t of parseTags(row.tags)) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN"))
      .slice(0, Math.max(limit, 1));
  }
  async signinLeaderboard(limit = 10): Promise<
    { userId: string; nickname: string; avatar: string | null; total: number }[]
  > {
    const { results } = await this.db
      .prepare(
        "SELECT user_id, COUNT(*) AS total FROM signins GROUP BY user_id ORDER BY total DESC LIMIT ?"
      )
      .bind(Math.min(Math.max(limit, 1), 50))
      .all();
    const rows = results as { user_id: string; total: number }[];
    if (!rows.length) return [];
    const ids = rows.map((r) => r.user_id);
    const ph = ids.map(() => "?").join(",");
    const { results: users } = await this.db
      .prepare(`SELECT id, nickname, avatar FROM users WHERE id IN (${ph})`)
      .bind(...ids)
      .all();
    const info = new Map<string, { nickname: string; avatar: string | null }>();
    for (const u of users as { id: string; nickname: string; avatar?: string | null }[]) {
      info.set(u.id, { nickname: u.nickname, avatar: u.avatar ?? null });
    }
    return rows.map((r) => ({
      userId: r.user_id,
      nickname: info.get(r.user_id)?.nickname ?? "已注销",
      avatar: info.get(r.user_id)?.avatar ?? null,
      total: Number(r.total),
    }));
  }

  /* ---------- 投票（Poll） ---------- */
  async createPoll(postId: string, options: string[]): Promise<void> {
    await this.db
      .prepare("INSERT INTO polls (post_id, options, created_at) VALUES (?, ?, ?)")
      .bind(postId, JSON.stringify(options), new Date().toISOString())
      .run();
  }
  async getPollResult(postId: string, userId: string): Promise<PollResult | null> {
    const poll = await this.db
      .prepare("SELECT options FROM polls WHERE post_id = ?")
      .bind(postId)
      .first();
    if (!poll) return null;
    let options: string[] = [];
    try {
      options = JSON.parse((poll as { options: string }).options) as string[];
    } catch {
      return null;
    }
    const { results } = await this.db
      .prepare("SELECT choice, COUNT(*) AS n FROM poll_votes WHERE post_id = ? GROUP BY choice")
      .bind(postId)
      .all();
    const votes = new Array<number>(options.length).fill(0);
    let total = 0;
    for (const r of results as { choice: number; n: number }[]) {
      const c = Number(r.choice);
      if (c >= 0 && c < options.length) {
        votes[c] = Number(r.n);
        total += Number(r.n);
      }
    }
    const my = await this.db
      .prepare("SELECT choice FROM poll_votes WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .first();
    return {
      options,
      votes,
      total,
      myChoice: my ? Number((my as { choice: number }).choice) : null,
    };
  }
  async castPollVote(
    postId: string,
    userId: string,
    choice: number
  ): Promise<{ ok: boolean; already: boolean; choice: number } | null> {
    const poll = await this.db
      .prepare("SELECT options FROM polls WHERE post_id = ?")
      .bind(postId)
      .first();
    if (!poll) return null;
    let options: string[] = [];
    try {
      options = JSON.parse((poll as { options: string }).options) as string[];
    } catch {
      return null;
    }
    if (!Number.isInteger(choice) || choice < 0 || choice >= options.length) return null;
    const existing = await this.db
      .prepare("SELECT choice FROM poll_votes WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .first();
    if (existing) {
      return { ok: false, already: true, choice: Number((existing as { choice: number }).choice) };
    }
    await this.db
      .prepare("INSERT INTO poll_votes (post_id, user_id, choice, created_at) VALUES (?, ?, ?, ?)")
      .bind(postId, userId, choice, new Date().toISOString())
      .run();
    return { ok: true, already: false, choice };
  }

  /* ---------- 回复点赞 ---------- */
  async toggleReplyLike(
    replyId: string,
    userId: string
  ): Promise<{ liked: boolean; likes: number }> {
    const existing = await this.db
      .prepare("SELECT 1 FROM reply_likes WHERE reply_id = ? AND user_id = ?")
      .bind(replyId, userId)
      .first();
    if (existing) {
      await this.db
        .prepare("DELETE FROM reply_likes WHERE reply_id = ? AND user_id = ?")
        .bind(replyId, userId)
        .run();
    } else {
      await this.db
        .prepare("INSERT INTO reply_likes (reply_id, user_id, created_at) VALUES (?, ?, ?)")
        .bind(replyId, userId, new Date().toISOString())
        .run();
    }
    const row = await this.db
      .prepare("SELECT COUNT(*) AS n FROM reply_likes WHERE reply_id = ?")
      .bind(replyId)
      .first();
    return { liked: !existing, likes: Number((row as { n: number }).n ?? 0) };
  }
  async listReplyLikesByUser(userId: string, replyIds: string[]): Promise<string[]> {
    if (!replyIds.length) return [];
    // D1 单条语句最多 100 个绑定参数（含 userId），因此分片查询后合并
    const CHUNK = 80;
    const out: string[] = [];
    for (let i = 0; i < replyIds.length; i += CHUNK) {
      const slice = replyIds.slice(i, i + CHUNK);
      const ph = slice.map(() => "?").join(",");
      const { results } = await this.db
        .prepare(`SELECT reply_id FROM reply_likes WHERE user_id = ? AND reply_id IN (${ph})`)
        .bind(userId, ...slice)
        .all();
      out.push(...(results as { reply_id: string }[]).map((r) => r.reply_id));
    }
    return out;
  }
  async getUserPoints(userId: string): Promise<{
    points: number;
    posts: number;
    replies: number;
    signins: number;
    likesReceived: number;
  }> {
    const one = async (sql: string): Promise<number> => {
      const row = await this.db.prepare(sql).bind(userId).first();
      return Number((row as { n: number }).n ?? 0);
    };
    const [posts, replies, signins, postLikes, replyLikes] = await Promise.all([
      one("SELECT COUNT(*) AS n FROM posts WHERE author_id = ?"),
      one("SELECT COUNT(*) AS n FROM replies WHERE author_id = ?"),
      one("SELECT COUNT(*) AS n FROM signins WHERE user_id = ?"),
      one("SELECT COALESCE(SUM(likes), 0) AS n FROM posts WHERE author_id = ?"),
      one(
        "SELECT COUNT(*) AS n FROM reply_likes rl JOIN replies r ON r.id = rl.reply_id WHERE r.author_id = ?"
      ),
    ]);
    const likesReceived = postLikes + replyLikes;
    return {
      points: posts * 5 + replies * 2 + signins * 3 + likesReceived,
      posts,
      replies,
      signins,
      likesReceived,
    };
  }

  /* ---------- 密码重置 / 邮件通知 ---------- */
  async setUserResetToken(
    id: string,
    token: string | null,
    expiresAt: string | null
  ): Promise<void> {
    await this.db
      .prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?")
      .bind(token, expiresAt, id)
      .run();
  }
  async getUserByResetToken(token: string): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT * FROM users WHERE reset_token = ?")
      .bind(token)
      .first();
    return (row as User) ?? null;
  }
  async deleteUserSessions(userId: string): Promise<void> {
    await this.db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
  }
  async setNotifyEmail(userId: string, enabled: boolean): Promise<void> {
    await this.db
      .prepare("UPDATE users SET notify_email = ? WHERE id = ?")
      .bind(enabled ? 1 : 0, userId)
      .run();
  }

  /* ---------- 站内公告 ---------- */
  async listAnnouncements(activeOnly = false): Promise<Announcement[]> {
    const sql = activeOnly
      ? `SELECT * FROM announcements WHERE expires_at IS NULL OR expires_at > ?
         ORDER BY created_at DESC LIMIT 20`
      : "SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50";
    const stmt = this.db.prepare(sql);
    const { results } = activeOnly
      ? await stmt.bind(new Date().toISOString()).all()
      : await stmt.all();
    return results as Announcement[];
  }
  async createAnnouncement(a: Announcement): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO announcements (id, content, created_at, expires_at) VALUES (?, ?, ?, ?)"
      )
      .bind(a.id, a.content, a.created_at, a.expires_at)
      .run();
  }
  async deleteAnnouncement(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM announcements WHERE id = ?").bind(id).run();
  }
  async createPsychResult(r: PsychResultRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO psych_results
           (id, user_id, scale_slug, total, max, level, level_key, type_code, answers, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        r.id,
        r.user_id,
        r.scale_slug,
        r.total,
        r.max,
        r.level,
        r.level_key,
        r.type_code,
        r.answers,
        r.created_at
      )
      .run();
  }
  async listPsychResults(userId: string, limit = 50): Promise<PsychResultRecord[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM psych_results WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
      )
      .bind(userId, Math.min(Math.max(limit, 1), 200))
      .all();
    return results as PsychResultRecord[];
  }
  async countPsychResults(scaleSlug?: string): Promise<number> {
    const row = scaleSlug
      ? await this.db
          .prepare("SELECT COUNT(*) AS n FROM psych_results WHERE scale_slug = ?")
          .bind(scaleSlug)
          .first()
      : await this.db.prepare("SELECT COUNT(*) AS n FROM psych_results").first();
    return Number((row as { n: number } | null)?.n ?? 0);
  }
  async psychCountsByScale(): Promise<Record<string, number>> {
    const { results } = await this.db
      .prepare("SELECT scale_slug, COUNT(*) AS n FROM psych_results GROUP BY scale_slug")
      .all();
    const out: Record<string, number> = {};
    for (const r of results as { scale_slug: string; n: number }[]) {
      out[r.scale_slug] = Number(r.n);
    }
    return out;
  }
  async deletePsychResult(id: string, userId: string): Promise<boolean> {
    const res = await this.db
      .prepare("DELETE FROM psych_results WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();
    return Number((res.meta as { changes?: number } | undefined)?.changes ?? 0) > 0;
  }

  /* ---------- 卡密系统（D1） ---------- */
  async getCardByKey(key: string): Promise<CardRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM cards WHERE card_key = ? LIMIT 1")
      .bind(key)
      .first();
    return (row as CardRecord) ?? null;
  }
  async insertCards(rows: CardRecord[]): Promise<string[]> {
    if (!rows.length) return [];
    // batch：一次提交，比逐条往返快得多（生成 1000 张时差别明显）
    const stmts = rows.map((r) =>
      this.db
        .prepare(
          `INSERT OR IGNORE INTO cards
             (card_key, prefix, plan, days, quota, used, bound_qq, expired_at, created_at, used_at, status, remark)
           VALUES (?, ?, ?, ?, ?, 0, '', ?, ?, 0, 1, ?)`
        )
        .bind(
          r.card_key,
          r.prefix,
          r.plan,
          r.days,
          r.quota,
          r.expired_at,
          r.created_at,
          r.remark
        )
    );
    const results = await this.db.batch(stmts);
    const inserted: string[] = [];
    results.forEach((res: D1Result, i: number) => {
      if (Number(res.meta?.changes ?? 0) > 0) inserted.push(rows[i].card_key);
    });
    return inserted;
  }
  async listCards(opts: {
    page?: number;
    pageSize?: number;
    status?: number;
    q?: string;
  }): Promise<{ rows: CardRecord[]; total: number }> {
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 100);
    const offset = (page - 1) * pageSize;

    const conds: string[] = [];
    const params: unknown[] = [];
    if (opts.status === 0 || opts.status === 1) {
      conds.push("status = ?");
      params.push(opts.status);
    }
    if (opts.q) {
      // 按字节截断：D1 的 LIKE 模式上限 50 字节，超长会直接报错
      const like = `%${escapeLike(truncateBytes(opts.q, 40))}%`;
      conds.push(
        "(card_key LIKE ? ESCAPE '\\' OR bound_qq LIKE ? ESCAPE '\\' OR remark LIKE ? ESCAPE '\\')"
      );
      params.push(like, like, like);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const totalRow = await this.db
      .prepare(`SELECT COUNT(*) AS n FROM cards ${where}`)
      .bind(...params)
      .first();
    const { results } = await this.db
      .prepare(
        `SELECT c.*, u.nickname AS bound_user_nickname
           FROM cards c LEFT JOIN users u ON u.id = c.bound_user_id
           ${where} ORDER BY c.id DESC LIMIT ? OFFSET ?`
      )
      .bind(...params, pageSize, offset)
      .all();
    return {
      rows: results as CardRecord[],
      total: Number((totalRow as { n: number } | null)?.n ?? 0),
    };
  }
  async revokeCard(key: string): Promise<number> {
    const res = await this.db
      .prepare("UPDATE cards SET status = 0 WHERE card_key = ?")
      .bind(key)
      .run();
    return Number((res.meta as { changes?: number } | undefined)?.changes ?? 0);
  }
  async consumeCard(key: string, qq: string, now: number): Promise<boolean> {
    // 单条条件 UPDATE：原子完成「校验 + 扣次 + 首次绑定 + 首次计时」
    const res = await this.db
      .prepare(
        `UPDATE cards
            SET used = used + 1,
                used_at = ?,
                bound_qq = CASE WHEN bound_qq = '' THEN ? ELSE bound_qq END,
                expired_at = CASE WHEN expired_at = 0 THEN ? + days * 86400 ELSE expired_at END
          WHERE card_key = ?
            AND status = 1
            AND (expired_at = 0 OR expired_at >= ?)
            AND (quota = 0 OR used < quota)
            AND redeemed_at = 0
            AND (bound_qq = '' OR bound_qq = ?)`
      )
      .bind(now, qq, now, key, now, qq)
      .run();
    return Number((res.meta as { changes?: number } | undefined)?.changes ?? 0) > 0;
  }
  async cardStats(): Promise<CardStats> {
    const now = Math.floor(Date.now() / 1000);
    // 一次聚合查询完成全部统计
    const row = await this.db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN expired_at > 0 THEN 1 ELSE 0 END) AS activated,
           SUM(CASE WHEN used > 0 THEN 1 ELSE 0 END) AS used,
           SUM(CASE WHEN status = 1 AND expired_at > 0 AND expired_at < ? THEN 1 ELSE 0 END) AS expired,
           SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS revoked,
           SUM(CASE WHEN status = 1 AND (expired_at = 0 OR expired_at >= ?)
                     AND (quota = 0 OR used < quota) THEN 1 ELSE 0 END) AS available
         FROM cards`
      )
      .bind(now, now)
      .first();
    const r = (row ?? {}) as Record<string, number | null>;
    return {
      total: Number(r.total ?? 0),
      activated: Number(r.activated ?? 0),
      used: Number(r.used ?? 0),
      expired: Number(r.expired ?? 0),
      revoked: Number(r.revoked ?? 0),
      available: Number(r.available ?? 0),
    };
  }
  async createCardLog(log: CardLogRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO card_logs (card_key, qq, action, ip, request_id, detail, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        log.card_key,
        log.qq,
        log.action,
        log.ip,
        log.request_id,
        log.detail,
        log.created_at
      )
      .run();
  }
  async getCardLogByRequestId(requestId: string): Promise<CardLogRecord | null> {
    if (!requestId) return null;
    const row = await this.db
      .prepare(
        "SELECT * FROM card_logs WHERE request_id = ? AND action = 'consume' ORDER BY id DESC LIMIT 1"
      )
      .bind(requestId)
      .first();
    return (row as CardLogRecord) ?? null;
  }
  async redeemCard(key: string, userId: string, now: number): Promise<boolean> {
    // 原子：只有「未按次使用过、未兑换过、未绑定任何一方」的卡才能整卡兑换到账号
    const res = await this.db
      .prepare(
        `UPDATE cards
            SET bound_user_id = ?, redeemed_at = ?
          WHERE card_key = ?
            AND status = 1
            AND redeemed_at = 0
            AND used = 0
            AND bound_qq = ''
            AND bound_user_id = ''
            AND (expired_at = 0 OR expired_at >= ?)`
      )
      .bind(userId, now, key, now)
      .run();
    return Number((res.meta as { changes?: number } | undefined)?.changes ?? 0) > 0;
  }
  async listRedeemedCards(userId: string): Promise<CardRecord[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM cards WHERE bound_user_id = ? ORDER BY redeemed_at DESC LIMIT 100"
      )
      .bind(userId)
      .all();
    return results as CardRecord[];
  }
  async getUserPlanRaw(userId: string): Promise<{
    plan: string;
    plan_expires_at: number;
    plan_quota: number;
    plan_used: number;
  } | null> {
    const row = await this.db
      .prepare(
        "SELECT plan, plan_expires_at, plan_quota, plan_used FROM users WHERE id = ?"
      )
      .bind(userId)
      .first();
    if (!row) return null;
    const r = row as {
      plan?: string;
      plan_expires_at?: number;
      plan_quota?: number;
      plan_used?: number;
    };
    return {
      plan: r.plan ?? "free",
      plan_expires_at: Number(r.plan_expires_at ?? 0),
      plan_quota: Number(r.plan_quota ?? 0),
      plan_used: Number(r.plan_used ?? 0),
    };
  }
  async setUserPlan(
    userId: string,
    plan: { plan: string; expiresAt: number; quota: number; used: number }
  ): Promise<void> {
    await this.db
      .prepare(
        "UPDATE users SET plan = ?, plan_expires_at = ?, plan_quota = ?, plan_used = ? WHERE id = ?"
      )
      .bind(plan.plan, plan.expiresAt, plan.quota, plan.used, userId)
      .run();
  }

  /* ---------- 卡密申请 ---------- */
  async createCardRequest(r: CardRequest): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO card_requests
           (user_id, plan, days, quota, reason, contact, status, card_key,
            review_note, reviewed_by, reviewed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, '', '', '', 0, ?)`
      )
      .bind(
        r.user_id,
        r.plan,
        r.days,
        r.quota,
        r.reason,
        r.contact,
        r.created_at
      )
      .run();
  }
  async listCardRequestsByUser(
    userId: string,
    limit = 20
  ): Promise<CardRequest[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM card_requests WHERE user_id = ? ORDER BY id DESC LIMIT ?"
      )
      .bind(userId, Math.min(Math.max(limit, 1), 100))
      .all();
    return results as CardRequest[];
  }
  async listCardRequests(opts: {
    page?: number;
    pageSize?: number;
    status?: number;
  }): Promise<{ rows: CardRequest[]; total: number }> {
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 100);
    const offset = (page - 1) * pageSize;

    const conds: string[] = [];
    const params: unknown[] = [];
    if (opts.status === 0 || opts.status === 1 || opts.status === 2) {
      conds.push("r.status = ?");
      params.push(opts.status);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const totalRow = await this.db
      .prepare(`SELECT COUNT(*) AS n FROM card_requests r ${where}`)
      .bind(...params)
      .first();
    const { results } = await this.db
      .prepare(
        `SELECT r.*, u.nickname AS user_nickname
           FROM card_requests r LEFT JOIN users u ON u.id = r.user_id
           ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`
      )
      .bind(...params, pageSize, offset)
      .all();
    return {
      rows: results as CardRequest[],
      total: Number((totalRow as { n: number } | null)?.n ?? 0),
    };
  }
  async getCardRequest(id: number): Promise<CardRequest | null> {
    const row = await this.db
      .prepare("SELECT * FROM card_requests WHERE id = ?")
      .bind(id)
      .first();
    return (row as CardRequest) ?? null;
  }
  async countPendingCardRequests(userId: string): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(*) AS n FROM card_requests WHERE user_id = ? AND status = 0"
      )
      .bind(userId)
      .first();
    return Number((row as { n: number } | null)?.n ?? 0);
  }
  async countRecentCardRequests(
    userId: string,
    sinceSec: number
  ): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(*) AS n FROM card_requests WHERE user_id = ? AND created_at >= ?"
      )
      .bind(userId, sinceSec)
      .first();
    return Number((row as { n: number } | null)?.n ?? 0);
  }
  async reviewCardRequest(
    id: number,
    patch: {
      status: 1 | 2;
      cardKey: string;
      note: string;
      reviewerId: string;
      reviewedAt: number;
    }
  ): Promise<boolean> {
    // 原子：仅当仍是「待审核」时生效，避免并发重复发卡
    const res = await this.db
      .prepare(
        `UPDATE card_requests
            SET status = ?, card_key = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?
          WHERE id = ? AND status = 0`
      )
      .bind(
        patch.status,
        patch.cardKey,
        patch.note,
        patch.reviewerId,
        patch.reviewedAt,
        id
      )
      .run();
    return Number((res.meta as { changes?: number } | undefined)?.changes ?? 0) > 0;
  }
}

/* ---------- 签到工具（Asia/Shanghai） ---------- */

/** 上海时区日期 YYYY-MM-DD（签到以中国本地日为准，避免 Worker UTC 偏移） */
export function shanghaiDay(date: Date): string {
  const p = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** 连续签到天数：今天已签从今天起算，否则从昨天起算（含今天/昨天的连续段） */
function calcStreak(days: string[]): number {
  const set = new Set(days);
  const cur = new Date();
  if (!set.has(shanghaiDay(cur))) cur.setDate(cur.getDate() - 1);
  let streak = 0;
  while (set.has(shanghaiDay(cur))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

/* ================= JSON 实现（本地开发） ================= */

interface JsonDb {
  users: User[];
  sessions: Session[];
  boards: Board[];
  posts: BbsPost[];
  replies: Reply[];
  files: FileRecord[];
  notifications: Notification[];
  favorites: { post_id: string; user_id: string }[];
  likes: { post_id: string; user_id: string }[];
  messages: Message[];
  follows: { follower_id: string; followee_id: string; created_at: string }[];
  signins: { user_id: string; day: string; created_at: string }[];
  polls: { post_id: string; options: string[]; created_at: string }[];
  pollVotes: { post_id: string; user_id: string; choice: number; created_at: string }[];
  replyLikes: { reply_id: string; user_id: string; created_at: string }[];
  announcements: Announcement[];
  psychResults: PsychResultRecord[];
  /** 卡密系统（可选：旧 db.json 里可能没有） */
  cards?: CardRecord[];
  cardLogs?: CardLogRecord[];
  cardRequests?: CardRequest[];
}

const DB_FILE = path.join(process.cwd(), "data", "db.json");
const SEED_BOARDS: Board[] = [
  {
    id: "b-frontend",
    slug: "frontend",
    name: "前端开发",
    description: "HTML/CSS/JS、框架与 UI",
    sort_order: 1,
    created_at: "2026-08-17T00:00:00.000Z",
  },
  {
    id: "b-backend",
    slug: "backend",
    name: "后端开发",
    description: "服务端、数据库与 API",
    sort_order: 2,
    created_at: "2026-08-17T00:00:00.000Z",
  },
  {
    id: "b-tech",
    slug: "tech",
    name: "技术综合",
    description: "编程、开发工具与技术讨论",
    sort_order: 3,
    created_at: "2026-08-17T00:00:00.000Z",
  },
  {
    id: "b-life",
    slug: "life",
    name: "生活杂谈",
    description: "日常分享、随想与闲聊",
    sort_order: 4,
    created_at: "2026-08-17T00:00:00.000Z",
  },
  {
    id: "b-gaming",
    slug: "gaming",
    name: "游戏交流",
    description: "游戏讨论、开服与联机",
    sort_order: 5,
    created_at: "2026-08-17T00:00:00.000Z",
  },
  {
    id: "b-share",
    slug: "share",
    name: "资源共享",
    description: "小文件传输、资料与链接分享",
    sort_order: 6,
    created_at: "2026-08-17T00:00:00.000Z",
  },
];

async function readJson(): Promise<JsonDb> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(raw) as JsonDb;
  } catch {
    return {
      users: [],
      sessions: [],
      boards: SEED_BOARDS,
      posts: [],
      replies: [],
      files: [],
      notifications: [],
      favorites: [],
      likes: [],
      messages: [],
      follows: [],
      signins: [],
      polls: [],
      pollVotes: [],
      replyLikes: [],
      announcements: [],
      psychResults: [],
      cards: [],
      cardLogs: [],
      cardRequests: [],
    };
  }
}

async function writeJson(db: JsonDb): Promise<void> {
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmp, DB_FILE);
}

class JsonDataStore implements DataStore {
  async createUser(u: User): Promise<void> {
    const db = await readJson();
    if (db.users.some((x) => x.email === u.email)) throw new Error("邮箱已注册");
    db.users.push(u);
    await writeJson(db);
  }
  async getUserByEmail(email: string): Promise<User | null> {
    const db = await readJson();
    return db.users.find((u) => u.email === email) ?? null;
  }
  async getUserById(id: string): Promise<User | null> {
    const db = await readJson();
    return db.users.find((u) => u.id === id) ?? null;
  }
  async listUsers(): Promise<User[]> {
    const db = await readJson();
    return [...db.users].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async updateUserProfile(
    id: string,
    patch: { nickname?: string; bio?: string; avatar?: string | null }
  ): Promise<User | null> {
    const db = await readJson();
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    if (patch.nickname !== undefined) u.nickname = patch.nickname;
    if (patch.bio !== undefined) u.bio = patch.bio;
    if (patch.avatar !== undefined) u.avatar = patch.avatar;
    await writeJson(db);
    return u;
  }
  async updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
    const db = await readJson();
    const u = db.users.find((x) => x.id === id);
    if (!u) return false;
    u.password_hash = passwordHash;
    await writeJson(db);
    return true;
  }
  async setUserVerifyToken(
    id: string,
    token: string | null,
    expiresAt: string | null
  ): Promise<void> {
    const db = await readJson();
    const u = db.users.find((x) => x.id === id);
    if (u) {
      u.verify_token = token;
      u.verify_token_expires = expiresAt;
      await writeJson(db);
    }
  }
  async getUserByVerifyToken(token: string): Promise<User | null> {
    const db = await readJson();
    return db.users.find((u) => u.verify_token === token) ?? null;
  }
  async markEmailVerified(id: string): Promise<void> {
    const db = await readJson();
    const u = db.users.find((x) => x.id === id);
    if (u) {
      u.email_verified = 1;
      u.verify_token = null;
      u.verify_token_expires = null;
      await writeJson(db);
    }
  }

  async createSession(s: Session): Promise<void> {
    const db = await readJson();
    db.sessions.push(s);
    await writeJson(db);
  }
  async getSession(token: string): Promise<Session | null> {
    const db = await readJson();
    return db.sessions.find((s) => s.token === token) ?? null;
  }
  async deleteSession(token: string): Promise<void> {
    const db = await readJson();
    db.sessions = db.sessions.filter((s) => s.token !== token);
    await writeJson(db);
  }

  async listBoards(): Promise<Board[]> {
    const db = await readJson();
    return db.boards.map((b) => ({
      ...b,
      post_count: db.posts.filter((p) => p.board_id === b.id).length,
    }));
  }
  async getBoard(id: string): Promise<Board | null> {
    const db = await readJson();
    return db.boards.find((b) => b.id === id) ?? null;
  }
  async getBoardBySlug(slug: string): Promise<Board | null> {
    const db = await readJson();
    return db.boards.find((b) => b.slug === slug) ?? null;
  }

  async listPosts(opts: {
    boardId?: string;
    authorId?: string;
    q?: string;
    tag?: string;
    sort?: "latest" | "hot";
    page?: number;
    pageSize?: number;
  }): Promise<{ posts: BbsPost[]; total: number }> {
    const db = await readJson();
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
    let posts = db.posts.filter((p) => {
      if (opts.boardId && p.board_id !== opts.boardId) return false;
      if (opts.authorId && p.author_id !== opts.authorId) return false;
      if (opts.tag && !(p.tags ?? []).includes(opts.tag)) return false;
      if (opts.q) {
        const q = opts.q.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.content.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    posts = [...posts].sort(
      opts.sort === "hot"
        ? (a, b) =>
            (b.sticky ?? 0) - (a.sticky ?? 0) ||
            (b.likes ?? 0) - (a.likes ?? 0) ||
            b.created_at.localeCompare(a.created_at)
        : (a, b) =>
            (b.sticky ?? 0) - (a.sticky ?? 0) ||
            b.created_at.localeCompare(a.created_at)
    );
    const total = posts.length;
    const pageItems = posts.slice((page - 1) * pageSize, page * pageSize).map((p) => ({
      ...p,
      author_nickname: db.users.find((u) => u.id === p.author_id)?.nickname ?? "匿名",
        author_avatar: db.users.find((u) => u.id === p.author_id)?.avatar ?? null,
      reply_count: db.replies.filter((r) => r.post_id === p.id).length,
    }));
    return { posts: pageItems, total };
  }
  async getPost(id: string): Promise<BbsPost | null> {
    const db = await readJson();
    const p = db.posts.find((x) => x.id === id);
    if (!p) return null;
    return {
      ...p,
      author_nickname: db.users.find((u) => u.id === p.author_id)?.nickname ?? "匿名",
        author_avatar: db.users.find((u) => u.id === p.author_id)?.avatar ?? null,
      reply_count: db.replies.filter((r) => r.post_id === p.id).length,
    };
  }
  async incrementPostViews(id: string): Promise<void> {
    const db = await readJson();
    const p = db.posts.find((x) => x.id === id);
    if (p) {
      p.view_count = (p.view_count ?? 0) + 1;
      await writeJson(db);
    }
  }
  async createPost(p: BbsPost): Promise<void> {
    const db = await readJson();
    db.posts.push({ ...p, view_count: 0 });
    await writeJson(db);
  }
  async updatePost(
    id: string,
    patch: { title?: string; content?: string }
  ): Promise<BbsPost | null> {
    const db = await readJson();
    const p = db.posts.find((x) => x.id === id);
    if (!p) return null;
    if (patch.title !== undefined) p.title = patch.title;
    if (patch.content !== undefined) p.content = patch.content;
    p.updated_at = new Date().toISOString();
    await writeJson(db);
    return this.getPost(id);
  }
  async setPostSticky(
    id: string,
    sticky: boolean
  ): Promise<BbsPost | null> {
    const db = await readJson();
    const p = db.posts.find((x) => x.id === id);
    if (!p) return null;
    p.sticky = sticky ? 1 : 0;
    await writeJson(db);
    return this.getPost(id);
  }
  async deletePost(id: string): Promise<void> {
    const db = await readJson();
    const replyIds = new Set(db.replies.filter((r) => r.post_id === id).map((r) => r.id));
    db.posts = db.posts.filter((p) => p.id !== id);
    db.replies = db.replies.filter((r) => r.post_id !== id);
    db.likes = db.likes.filter((l) => l.post_id !== id);
    db.favorites = db.favorites.filter((f) => f.post_id !== id);
    db.notifications = db.notifications.filter((n) => n.post_id !== id);
    db.polls = db.polls.filter((p) => p.post_id !== id);
    db.pollVotes = db.pollVotes.filter((v) => v.post_id !== id);
    db.replyLikes = db.replyLikes.filter((l) => !replyIds.has(l.reply_id));
    await writeJson(db);
  }

  async listReplies(postId: string): Promise<Reply[]> {
    const db = await readJson();
    return db.replies
      .filter((r) => r.post_id === postId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({
        ...r,
        author_nickname: db.users.find((u) => u.id === r.author_id)?.nickname ?? "匿名",
        author_avatar: db.users.find((u) => u.id === r.author_id)?.avatar ?? null,
        likes: db.replyLikes.filter((l) => l.reply_id === r.id).length,
      }));
  }
  async listRepliesPage(
    postId: string,
    page: number,
    pageSize: number
  ): Promise<{ replies: Reply[]; total: number }> {
    const db = await readJson();
    const all = db.replies
      .filter((r) => r.post_id === postId && !r.parent_id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({
        ...r,
        author_nickname: db.users.find((u) => u.id === r.author_id)?.nickname ?? "匿名",
        author_avatar: db.users.find((u) => u.id === r.author_id)?.avatar ?? null,
        likes: db.replyLikes.filter((l) => l.reply_id === r.id).length,
      }));
    const total = all.length;
    const p = Math.max(page, 1);
    const size = Math.min(Math.max(pageSize, 1), 100);
    return { replies: all.slice((p - 1) * size, p * size), total };
  }
  async listChildReplies(postId: string): Promise<Reply[]> {
    const db = await readJson();
    return db.replies
      .filter((r) => r.post_id === postId && !!r.parent_id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({
        ...r,
        author_nickname: db.users.find((u) => u.id === r.author_id)?.nickname ?? "匿名",
        author_avatar: db.users.find((u) => u.id === r.author_id)?.avatar ?? null,
        likes: db.replyLikes.filter((l) => l.reply_id === r.id).length,
        reply_to_nickname:
          db.users.find((u) => u.id === r.reply_to_user_id)?.nickname ?? undefined,
      }));
  }
  async createReply(r: Reply): Promise<void> {
    const db = await readJson();
    db.replies.push(r);
    await writeJson(db);
  }
  async getReply(id: string): Promise<Reply | null> {
    const db = await readJson();
    return db.replies.find((r) => r.id === id) ?? null;
  }
  async updateReply(
    id: string,
    patch: { content: string }
  ): Promise<Reply | null> {
    const db = await readJson();
    const r = db.replies.find((x) => x.id === id);
    if (!r) return null;
    r.content = patch.content;
    await writeJson(db);
    return r;
  }
  async deleteReply(id: string): Promise<void> {
    const db = await readJson();
    const childIds = db.replies.filter((r) => r.parent_id === id).map((r) => r.id);
    const removeIds = new Set([id, ...childIds]);
    db.replyLikes = db.replyLikes.filter((l) => !removeIds.has(l.reply_id));
    // 与 D1 实现一致：连子回复一起删除，避免留下悬空的孤儿回复
    db.replies = db.replies.filter((r) => !removeIds.has(r.id));
    await writeJson(db);
  }
  async toggleLike(
    postId: string,
    userId: string
  ): Promise<{ liked: boolean; likes: number }> {
    const db = await readJson();
    const p = db.posts.find((x) => x.id === postId);
    if (!p) return { liked: false, likes: 0 };
    const liked = db.likes.some((l) => l.post_id === postId && l.user_id === userId);
    if (liked) {
      p.likes = Math.max((p.likes ?? 1) - 1, 0);
      db.likes = db.likes.filter(
        (l) => !(l.post_id === postId && l.user_id === userId)
      );
    } else {
      p.likes = (p.likes ?? 0) + 1;
      db.likes.push({ post_id: postId, user_id: userId });
    }
    await writeJson(db);
    return { liked: !liked, likes: p.likes ?? 0 };
  }
  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    const db = await readJson();
    return db.likes.some((l) => l.post_id === postId && l.user_id === userId);
  }
  async toggleFavorite(
    postId: string,
    userId: string
  ): Promise<{ favorited: boolean; count: number }> {
    const db = await readJson();
    const favs = (db as unknown as { favorites?: { post_id: string; user_id: string }[] }).favorites ?? [];
    const favorited = favs.some((f) => f.post_id === postId && f.user_id === userId);
    if (favorited) {
      const filtered = favs.filter((f) => !(f.post_id === postId && f.user_id === userId));
      (db as unknown as { favorites: typeof favs }).favorites = filtered;
    } else {
      favs.push({ post_id: postId, user_id: userId });
    }
    await writeJson(db);
    // 从落盘状态重新统计，避免改用 filtered 后仍按旧数组计数（与 D1 实现保持一致）
    const count = ((db as unknown as { favorites?: typeof favs }).favorites ?? []).filter(
      (f) => f.post_id === postId
    ).length;
    return { favorited: !favorited, count };
  }
  async isPostFavorited(postId: string, userId: string): Promise<boolean> {
    const db = await readJson();
    const favs = (db as unknown as { favorites?: { post_id: string; user_id: string }[] }).favorites ?? [];
    return favs.some((f) => f.post_id === postId && f.user_id === userId);
  }
  async listFavoritePosts(userId: string): Promise<BbsPost[]> {
    const db = await readJson();
    const favs = (db as unknown as { favorites?: { post_id: string; user_id: string }[] }).favorites ?? [];
    const ids = favs.filter((f) => f.user_id === userId).map((f) => f.post_id);
    return db.posts
      .filter((p) => ids.includes(p.id))
      .map((p) => ({
        ...p,
        author_nickname: db.users.find((u) => u.id === p.author_id)?.nickname ?? "匿名",
        author_avatar: db.users.find((u) => u.id === p.author_id)?.avatar ?? null,
        reply_count: db.replies.filter((r) => r.post_id === p.id).length,
      }));
  }

  async createNotification(n: Notification): Promise<void> {
    const db = await readJson();
    db.notifications.push(n);
    await writeJson(db);
  }
  async listNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const db = await readJson();
    return db.notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
      .map((n) => ({
        ...n,
        actor_nickname: db.users.find((u) => u.id === n.actor_id)?.nickname ?? "匿名",
      }));
  }
  async unreadNotificationCount(userId: string): Promise<number> {
    const db = await readJson();
    return db.notifications.filter((n) => n.user_id === userId && !n.is_read).length;
  }
  async markNotificationsRead(userId: string): Promise<void> {
    const db = await readJson();
    db.notifications.forEach((n) => {
      if (n.user_id === userId) n.is_read = 1;
    });
    await writeJson(db);
  }

  async listFiles(opts: {
    page?: number;
    pageSize?: number;
  }): Promise<{ files: FileRecord[]; total: number }> {
    const db = await readJson();
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
    const sorted = [...db.files].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const total = sorted.length;
    const items = sorted.slice((page - 1) * pageSize, page * pageSize).map((f) => ({
      ...f,
      uploader_nickname: f.uploader_id
        ? db.users.find((u) => u.id === f.uploader_id)?.nickname ?? "匿名"
        : undefined,
    }));
    return { files: items, total };
  }
  async getFile(id: string): Promise<FileRecord | null> {
    const db = await readJson();
    return db.files.find((f) => f.id === id) ?? null;
  }
  async getFilesByIds(ids: string[]): Promise<FileRecord[]> {
    const db = await readJson();
    return db.files.filter((f) => ids.includes(f.id));
  }
  async createFile(f: FileRecord): Promise<void> {
    const db = await readJson();
    db.files.push(f);
    await writeJson(db);
  }
  async deleteFile(id: string): Promise<void> {
    const db = await readJson();
    db.files = db.files.filter((f) => f.id !== id);
    await writeJson(db);
  }
  async countFileReferences(fileId: string): Promise<number> {
    const db = await readJson();
    const inPosts = db.posts.filter((p) => (p.attachments ?? []).includes(fileId)).length;
    const asAvatar = db.users.filter((u) => u.avatar === fileId).length;
    return inPosts + asAvatar;
  }

  /* ---------- 私信 ---------- */
  async createMessage(m: Message): Promise<void> {
    const db = await readJson();
    db.messages.push(m);
    await writeJson(db);
  }
  async listConversations(userId: string): Promise<Conversation[]> {
    const db = await readJson();
    const mine = db.messages
      .filter((m) => m.sender_id === userId || m.receiver_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const lastByOther = new Map<string, Message>();
    const unread = new Map<string, number>();
    for (const m of mine) {
      const other = m.sender_id === userId ? m.receiver_id : m.sender_id;
      if (!lastByOther.has(other)) lastByOther.set(other, m);
      if (m.receiver_id === userId && !m.is_read) {
        unread.set(other, (unread.get(other) ?? 0) + 1);
      }
    }
    return [...lastByOther.entries()]
      .map(([uid, last]) => ({
        userId: uid,
        nickname: db.users.find((u) => u.id === uid)?.nickname ?? "已注销",
        avatar: db.users.find((u) => u.id === uid)?.avatar ?? null,
        lastContent: last.content,
        lastAt: last.created_at,
        unread: unread.get(uid) ?? 0,
      }))
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }
  async listMessages(userId: string, otherId: string): Promise<Message[]> {
    const db = await readJson();
    return db.messages
      .filter(
        (m) =>
          (m.sender_id === userId && m.receiver_id === otherId) ||
          (m.sender_id === otherId && m.receiver_id === userId)
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-200)
      .map((m) => ({
        ...m,
        sender_nickname: db.users.find((u) => u.id === m.sender_id)?.nickname,
      }));
  }
  async markConversationRead(userId: string, otherId: string): Promise<void> {
    const db = await readJson();
    let changed = false;
    db.messages.forEach((m) => {
      if (m.receiver_id === userId && m.sender_id === otherId && !m.is_read) {
        m.is_read = 1;
        changed = true;
      }
    });
    if (changed) await writeJson(db);
  }
  async unreadMessageCount(userId: string): Promise<number> {
    const db = await readJson();
    return db.messages.filter((m) => m.receiver_id === userId && !m.is_read).length;
  }

  /* ---------- 关注 ---------- */
  async toggleFollow(
    followerId: string,
    followeeId: string
  ): Promise<{ following: boolean; followers: number }> {
    const db = await readJson();
    const idx = db.follows.findIndex(
      (f) => f.follower_id === followerId && f.followee_id === followeeId
    );
    if (idx >= 0) {
      db.follows.splice(idx, 1);
    } else {
      db.follows.push({
        follower_id: followerId,
        followee_id: followeeId,
        created_at: new Date().toISOString(),
      });
    }
    await writeJson(db);
    return {
      following: idx < 0,
      followers: db.follows.filter((f) => f.followee_id === followeeId).length,
    };
  }
  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const db = await readJson();
    return db.follows.some(
      (f) => f.follower_id === followerId && f.followee_id === followeeId
    );
  }
  async countFollowers(userId: string): Promise<number> {
    const db = await readJson();
    return db.follows.filter((f) => f.followee_id === userId).length;
  }
  async countFollowing(userId: string): Promise<number> {
    const db = await readJson();
    return db.follows.filter((f) => f.follower_id === userId).length;
  }
  async listFollowingPosts(
    followerId: string,
    opts: { page?: number; pageSize?: number }
  ): Promise<{ posts: BbsPost[]; total: number }> {
    const db = await readJson();
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
    const followed = new Set(
      db.follows.filter((f) => f.follower_id === followerId).map((f) => f.followee_id)
    );
    const all = db.posts
      .filter((p) => followed.has(p.author_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((p) => ({
        ...p,
        author_nickname: db.users.find((u) => u.id === p.author_id)?.nickname ?? "匿名",
        author_avatar: db.users.find((u) => u.id === p.author_id)?.avatar ?? null,
        reply_count: db.replies.filter((r) => r.post_id === p.id).length,
      }));
    return {
      posts: all.slice((page - 1) * pageSize, page * pageSize),
      total: all.length,
    };
  }
  async listFollowers(userId: string): Promise<UserBrief[]> {
    const db = await readJson();
    return db.follows
      .filter((f) => f.followee_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((f) => db.users.find((u) => u.id === f.follower_id))
      .filter((u): u is User => Boolean(u))
      .map((u) => ({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar ?? null,
        bio: u.bio ?? "",
        created_at: u.created_at,
      }));
  }
  async listFollowing(userId: string): Promise<UserBrief[]> {
    const db = await readJson();
    return db.follows
      .filter((f) => f.follower_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((f) => db.users.find((u) => u.id === f.followee_id))
      .filter((u): u is User => Boolean(u))
      .map((u) => ({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar ?? null,
        bio: u.bio ?? "",
        created_at: u.created_at,
      }));
  }
  async getUserByNickname(nickname: string): Promise<User | null> {
    const db = await readJson();
    return db.users.find((u) => u.nickname === nickname) ?? null;
  }
  async getSiteStats(): Promise<{
    users: number;
    posts: number;
    replies: number;
    files: number;
    messages: number;
    signins: number;
  }> {
    const db = await readJson();
    return {
      users: db.users.length,
      posts: db.posts.length,
      replies: db.replies.length,
      files: db.files.length,
      messages: db.messages.length,
      signins: db.signins.length,
    };
  }

  /* ---------- 签到 ---------- */
  async signToday(
    userId: string
  ): Promise<{ ok: boolean; already: boolean; streak: number }> {
    const db = await readJson();
    const day = shanghaiDay(new Date());
    const already = db.signins.some((s) => s.user_id === userId && s.day === day);
    if (!already) {
      db.signins.push({ user_id: userId, day, created_at: new Date().toISOString() });
      await writeJson(db);
    }
    const days = db.signins.filter((s) => s.user_id === userId).map((s) => s.day);
    return { ok: !already, already, streak: calcStreak(days) };
  }
  async getSignStats(
    userId: string
  ): Promise<{ today: boolean; streak: number; total: number }> {
    const db = await readJson();
    const days = db.signins.filter((s) => s.user_id === userId).map((s) => s.day);
    return {
      today: days.includes(shanghaiDay(new Date())),
      streak: calcStreak(days),
      total: days.length,
    };
  }
  async listSigninDays(userId: string, days = 120): Promise<string[]> {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const db = await readJson();
    return db.signins
      .filter((s) => s.user_id === userId && s.day >= since)
      .map((s) => s.day)
      .sort();
  }
  async listTags(limit = 60): Promise<{ tag: string; count: number }[]> {
    const db = await readJson();
    const counts = new Map<string, number>();
    for (const p of db.posts) {
      for (const t of p.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN"))
      .slice(0, Math.max(limit, 1));
  }
  async signinLeaderboard(limit = 10): Promise<
    { userId: string; nickname: string; avatar: string | null; total: number }[]
  > {
    const db = await readJson();
    const counts = new Map<string, number>();
    for (const s of db.signins) {
      counts.set(s.user_id, (counts.get(s.user_id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(Math.max(limit, 1), 50))
      .map(([userId, total]) => ({
        userId,
        nickname: db.users.find((u) => u.id === userId)?.nickname ?? "已注销",
        avatar: db.users.find((u) => u.id === userId)?.avatar ?? null,
        total,
      }));
  }

  /* ---------- 投票（Poll） ---------- */
  async createPoll(postId: string, options: string[]): Promise<void> {
    const db = await readJson();
    db.polls.push({ post_id: postId, options, created_at: new Date().toISOString() });
    await writeJson(db);
  }
  async getPollResult(postId: string, userId: string): Promise<PollResult | null> {
    const db = await readJson();
    const poll = db.polls.find((p) => p.post_id === postId);
    if (!poll) return null;
    const votes = new Array<number>(poll.options.length).fill(0);
    for (const v of db.pollVotes.filter((v) => v.post_id === postId)) {
      if (v.choice >= 0 && v.choice < votes.length) votes[v.choice] += 1;
    }
    const mine = db.pollVotes.find((v) => v.post_id === postId && v.user_id === userId);
    return {
      options: poll.options,
      votes,
      total: votes.reduce((a, b) => a + b, 0),
      myChoice: mine ? mine.choice : null,
    };
  }
  async castPollVote(
    postId: string,
    userId: string,
    choice: number
  ): Promise<{ ok: boolean; already: boolean; choice: number } | null> {
    const db = await readJson();
    const poll = db.polls.find((p) => p.post_id === postId);
    if (!poll || !Number.isInteger(choice) || choice < 0 || choice >= poll.options.length) {
      return null;
    }
    const existing = db.pollVotes.find((v) => v.post_id === postId && v.user_id === userId);
    if (existing) return { ok: false, already: true, choice: existing.choice };
    db.pollVotes.push({
      post_id: postId,
      user_id: userId,
      choice,
      created_at: new Date().toISOString(),
    });
    await writeJson(db);
    return { ok: true, already: false, choice };
  }

  /* ---------- 回复点赞 ---------- */
  async toggleReplyLike(
    replyId: string,
    userId: string
  ): Promise<{ liked: boolean; likes: number }> {
    const db = await readJson();
    const idx = db.replyLikes.findIndex(
      (l) => l.reply_id === replyId && l.user_id === userId
    );
    if (idx >= 0) {
      db.replyLikes.splice(idx, 1);
    } else {
      db.replyLikes.push({
        reply_id: replyId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
    }
    await writeJson(db);
    return {
      liked: idx < 0,
      likes: db.replyLikes.filter((l) => l.reply_id === replyId).length,
    };
  }
  async listReplyLikesByUser(userId: string, replyIds: string[]): Promise<string[]> {
    const db = await readJson();
    const set = new Set(replyIds);
    return db.replyLikes
      .filter((l) => l.user_id === userId && set.has(l.reply_id))
      .map((l) => l.reply_id);
  }
  async getUserPoints(userId: string): Promise<{
    points: number;
    posts: number;
    replies: number;
    signins: number;
    likesReceived: number;
  }> {
    const db = await readJson();
    const posts = db.posts.filter((p) => p.author_id === userId);
    const replies = db.replies.filter((r) => r.author_id === userId);
    const signins = db.signins.filter((s) => s.user_id === userId).length;
    const postLikes = posts.reduce((sum, p) => sum + (p.likes ?? 0), 0);
    const myReplyIds = new Set(replies.map((r) => r.id));
    const replyLikes = db.replyLikes.filter((l) => myReplyIds.has(l.reply_id)).length;
    const likesReceived = postLikes + replyLikes;
    return {
      points: posts.length * 5 + replies.length * 2 + signins * 3 + likesReceived,
      posts: posts.length,
      replies: replies.length,
      signins,
      likesReceived,
    };
  }

  /* ---------- 密码重置 / 邮件通知 ---------- */
  async setUserResetToken(
    id: string,
    token: string | null,
    expiresAt: string | null
  ): Promise<void> {
    const db = await readJson();
    const u = db.users.find((x) => x.id === id);
    if (u) {
      u.reset_token = token;
      u.reset_token_expires = expiresAt;
      await writeJson(db);
    }
  }
  async getUserByResetToken(token: string): Promise<User | null> {
    const db = await readJson();
    return db.users.find((u) => u.reset_token === token) ?? null;
  }
  async deleteUserSessions(userId: string): Promise<void> {
    const db = await readJson();
    db.sessions = db.sessions.filter((s) => s.user_id !== userId);
    await writeJson(db);
  }
  async setNotifyEmail(userId: string, enabled: boolean): Promise<void> {
    const db = await readJson();
    const u = db.users.find((x) => x.id === userId);
    if (u) {
      u.notify_email = enabled ? 1 : 0;
      await writeJson(db);
    }
  }

  /* ---------- 站内公告 ---------- */
  async listAnnouncements(activeOnly = false): Promise<Announcement[]> {
    const db = await readJson();
    const now = new Date().toISOString();
    return db.announcements
      .filter((a) => !activeOnly || !a.expires_at || a.expires_at > now)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, activeOnly ? 20 : 50);
  }
  async createAnnouncement(a: Announcement): Promise<void> {
    const db = await readJson();
    db.announcements.push(a);
    await writeJson(db);
  }
  async deleteAnnouncement(id: string): Promise<void> {
    const db = await readJson();
    db.announcements = db.announcements.filter((a) => a.id !== id);
    await writeJson(db);
  }
  async createPsychResult(r: PsychResultRecord): Promise<void> {
    const db = await readJson();
    db.psychResults = db.psychResults ?? [];
    db.psychResults.push(r);
    await writeJson(db);
  }
  async listPsychResults(userId: string, limit = 50): Promise<PsychResultRecord[]> {
    const db = await readJson();
    return (db.psychResults ?? [])
      .filter((r) => r.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, Math.min(Math.max(limit, 1), 200));
  }
  async countPsychResults(scaleSlug?: string): Promise<number> {
    const db = await readJson();
    return (db.psychResults ?? []).filter(
      (r) => !scaleSlug || r.scale_slug === scaleSlug
    ).length;
  }
  async psychCountsByScale(): Promise<Record<string, number>> {
    const db = await readJson();
    const out: Record<string, number> = {};
    for (const r of db.psychResults ?? []) {
      out[r.scale_slug] = (out[r.scale_slug] ?? 0) + 1;
    }
    return out;
  }
  async deletePsychResult(id: string, userId: string): Promise<boolean> {
    const db = await readJson();
    const before = (db.psychResults ?? []).length;
    db.psychResults = (db.psychResults ?? []).filter(
      (r) => !(r.id === id && r.user_id === userId)
    );
    if (db.psychResults.length === before) return false;
    await writeJson(db);
    return true;
  }

  /* ---------- 卡密系统（JSON 本地开发用） ---------- */
  async getCardByKey(key: string): Promise<CardRecord | null> {
    const db = await readJson();
    return (db.cards ?? []).find((c) => c.card_key === key) ?? null;
  }
  async insertCards(rows: CardRecord[]): Promise<string[]> {
    const db = await readJson();
    db.cards = db.cards ?? [];
    const existing = new Set(db.cards.map((c) => c.card_key));
    let nextId = db.cards.reduce((max, c) => Math.max(max, c.id ?? 0), 0) + 1;
    const inserted: string[] = [];
    for (const r of rows) {
      if (existing.has(r.card_key)) continue;
      existing.add(r.card_key);
      db.cards.push({ ...r, id: nextId++ });
      inserted.push(r.card_key);
    }
    if (inserted.length) await writeJson(db);
    return inserted;
  }
  async listCards(opts: {
    page?: number;
    pageSize?: number;
    status?: number;
    q?: string;
  }): Promise<{ rows: CardRecord[]; total: number }> {
    const db = await readJson();
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 100);
    const q = (opts.q ?? "").toLowerCase();
    let rows = [...(db.cards ?? [])];
    if (opts.status === 0 || opts.status === 1) {
      rows = rows.filter((c) => c.status === opts.status);
    }
    if (q) {
      rows = rows.filter(
        (c) =>
          c.card_key.toLowerCase().includes(q) ||
          c.bound_qq.includes(q) ||
          c.remark.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    const total = rows.length;
    const offset = (page - 1) * pageSize;
    const nicknameOf = (userId: string) =>
      userId
        ? ((db.users ?? []).find((u) => u.id === userId)?.nickname ?? null)
        : null;
    return {
      rows: rows.slice(offset, offset + pageSize).map((c) => ({
        ...c,
        bound_user_nickname: nicknameOf(c.bound_user_id),
      })),
      total,
    };
  }
  async revokeCard(key: string): Promise<number> {
    const db = await readJson();
    const card = (db.cards ?? []).find((c) => c.card_key === key);
    if (!card || card.status === 0) return 0;
    card.status = 0;
    await writeJson(db);
    return 1;
  }
  async consumeCard(key: string, qq: string, now: number): Promise<boolean> {
    const db = await readJson();
    const card = (db.cards ?? []).find((c) => c.card_key === key);
    // 与 D1 实现完全相同的判定规则
    if (!card) return false;
    if (card.status !== 1) return false;
    if (card.redeemed_at !== 0) return false;
    if (card.expired_at !== 0 && card.expired_at < now) return false;
    if (card.quota > 0 && card.used >= card.quota) return false;
    if (card.bound_qq !== "" && card.bound_qq !== qq) return false;

    card.used += 1;
    card.used_at = now;
    if (card.bound_qq === "" && qq !== "") card.bound_qq = qq;
    if (card.expired_at === 0) card.expired_at = now + card.days * 86400;
    await writeJson(db);
    return true;
  }
  async cardStats(): Promise<CardStats> {
    const db = await readJson();
    const now = Math.floor(Date.now() / 1000);
    const all = db.cards ?? [];
    return {
      total: all.length,
      activated: all.filter((c) => c.expired_at > 0).length,
      used: all.filter((c) => c.used > 0).length,
      expired: all.filter(
        (c) => c.status === 1 && c.expired_at > 0 && c.expired_at < now
      ).length,
      revoked: all.filter((c) => c.status === 0).length,
      available: all.filter(
        (c) =>
          c.status === 1 &&
          (c.expired_at === 0 || c.expired_at >= now) &&
          (c.quota === 0 || c.used < c.quota)
      ).length,
    };
  }
  async createCardLog(log: CardLogRecord): Promise<void> {
    const db = await readJson();
    db.cardLogs = db.cardLogs ?? [];
    db.cardLogs.push(log);
    await writeJson(db);
  }
  async getCardLogByRequestId(requestId: string): Promise<CardLogRecord | null> {
    if (!requestId) return null;
    const db = await readJson();
    const list = (db.cardLogs ?? []).filter(
      (l) => l.request_id === requestId && l.action === "consume"
    );
    return list.length ? list[list.length - 1] : null;
  }
  async redeemCard(key: string, userId: string, now: number): Promise<boolean> {
    const db = await readJson();
    const card = (db.cards ?? []).find((c) => c.card_key === key);
    // 与 D1 实现相同的判定
    if (!card) return false;
    if (card.status !== 1) return false;
    if (card.redeemed_at !== 0) return false;
    if (card.used !== 0) return false;
    if (card.bound_qq !== "" || card.bound_user_id !== "") return false;
    if (card.expired_at !== 0 && card.expired_at < now) return false;

    card.bound_user_id = userId;
    card.redeemed_at = now;
    await writeJson(db);
    return true;
  }
  async listRedeemedCards(userId: string): Promise<CardRecord[]> {
    const db = await readJson();
    return (db.cards ?? [])
      .filter((c) => c.bound_user_id === userId)
      .sort((a, b) => b.redeemed_at - a.redeemed_at)
      .slice(0, 100);
  }
  async getUserPlanRaw(userId: string): Promise<{
    plan: string;
    plan_expires_at: number;
    plan_quota: number;
    plan_used: number;
  } | null> {
    const db = await readJson();
    const user = (db.users ?? []).find((u) => u.id === userId);
    if (!user) return null;
    return {
      plan: user.plan ?? "free",
      plan_expires_at: Number(user.plan_expires_at ?? 0),
      plan_quota: Number(user.plan_quota ?? 0),
      plan_used: Number(user.plan_used ?? 0),
    };
  }
  async setUserPlan(
    userId: string,
    plan: { plan: string; expiresAt: number; quota: number; used: number }
  ): Promise<void> {
    const db = await readJson();
    const user = (db.users ?? []).find((u) => u.id === userId);
    if (!user) return;
    user.plan = plan.plan;
    user.plan_expires_at = plan.expiresAt;
    user.plan_quota = plan.quota;
    user.plan_used = plan.used;
    await writeJson(db);
  }

  /* ---------- 卡密申请（与 D1 实现行为一致） ---------- */
  async createCardRequest(r: CardRequest): Promise<void> {
    const db = await readJson();
    db.cardRequests = db.cardRequests ?? [];
    const nextId =
      db.cardRequests.reduce((m, x) => Math.max(m, Number(x.id ?? 0)), 0) + 1;
    db.cardRequests.push({
      ...r,
      id: nextId,
      status: 0,
      card_key: "",
      review_note: "",
      reviewed_by: "",
      reviewed_at: 0,
    });
    await writeJson(db);
  }
  async listCardRequestsByUser(
    userId: string,
    limit = 20
  ): Promise<CardRequest[]> {
    const db = await readJson();
    return (db.cardRequests ?? [])
      .filter((r) => r.user_id === userId)
      .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0))
      .slice(0, Math.min(Math.max(limit, 1), 100));
  }
  async listCardRequests(opts: {
    page?: number;
    pageSize?: number;
    status?: number;
  }): Promise<{ rows: CardRequest[]; total: number }> {
    const db = await readJson();
    const page = Math.max(opts.page ?? 1, 1);
    const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 100);
    let all = [...(db.cardRequests ?? [])].sort(
      (a, b) => Number(b.id ?? 0) - Number(a.id ?? 0)
    );
    if (opts.status === 0 || opts.status === 1 || opts.status === 2) {
      all = all.filter((r) => r.status === opts.status);
    }
    const total = all.length;
    const rows = all
      .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
      .map((r) => ({
        ...r,
        user_nickname:
          (db.users ?? []).find((u) => u.id === r.user_id)?.nickname ?? null,
      }));
    return { rows, total };
  }
  async getCardRequest(id: number): Promise<CardRequest | null> {
    const db = await readJson();
    return (db.cardRequests ?? []).find((r) => Number(r.id) === id) ?? null;
  }
  async countPendingCardRequests(userId: string): Promise<number> {
    const db = await readJson();
    return (db.cardRequests ?? []).filter(
      (r) => r.user_id === userId && r.status === 0
    ).length;
  }
  async countRecentCardRequests(
    userId: string,
    sinceSec: number
  ): Promise<number> {
    const db = await readJson();
    return (db.cardRequests ?? []).filter(
      (r) => r.user_id === userId && Number(r.created_at) >= sinceSec
    ).length;
  }
  async reviewCardRequest(
    id: number,
    patch: {
      status: 1 | 2;
      cardKey: string;
      note: string;
      reviewerId: string;
      reviewedAt: number;
    }
  ): Promise<boolean> {
    const db = await readJson();
    const r = (db.cardRequests ?? []).find((x) => Number(x.id) === id);
    if (!r || r.status !== 0) return false;
    r.status = patch.status;
    r.card_key = patch.cardKey;
    r.review_note = patch.note;
    r.reviewed_by = patch.reviewerId;
    r.reviewed_at = patch.reviewedAt;
    await writeJson(db);
    return true;
  }
}

/* ================= 工具函数 ================= */

/** 转义 SQL LIKE 通配符（% _ \），配合 ESCAPE '\' 使用，防止用户输入被当作通配符 */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * 按 UTF-8 字节数截断字符串
 * D1 对 LIKE/GLOB 模式有 50 字节上限，超过会直接抛错（搜索页 500），
 * 因此在拼接 %...% 之前先按字节截断（中文 1 字 = 3 字节）。
 */
function truncateBytes(input: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  if (encoder.encode(input).length <= maxBytes) return input;
  let out = "";
  let used = 0;
  for (const ch of input) {
    const size = encoder.encode(ch).length;
    if (used + size > maxBytes) break;
    out += ch;
    used += size;
  }
  return out;
}

/** D1 中 attachments/tags 是 JSON 字符串，解析为数组 */
function parseAttachments(p: BbsPost): BbsPost {
  if (typeof p.attachments === "string") {
    try {
      p.attachments = JSON.parse(p.attachments) as string[];
    } catch {
      p.attachments = [];
    }
  }
  if (typeof p.tags === "string") {
    try {
      p.tags = JSON.parse(p.tags) as string[];
    } catch {
      p.tags = [];
    }
  }
  return p;
}

/** 解析 D1 中 posts.tags 的 JSON 字符串（容错为非字符串数组） */
function parseTags(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export { uid, slugify } from "./id";
