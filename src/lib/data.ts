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
} from "./types";

/* ================= 接口定义 ================= */

export interface DataStore {
  createUser(u: User): Promise<void>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUserProfile(id: string, patch: { nickname?: string; bio?: string }): Promise<User | null>;
  updateUserPassword(id: string, passwordHash: string): Promise<boolean>;
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
}

/* ================= 运行时选择 ================= */

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

type D1Database = {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      all(): Promise<{ results: unknown[] }>;
      first(): Promise<unknown>;
      run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
    };
    all(): Promise<{ results: unknown[] }>;
    first(): Promise<unknown>;
    run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
  };
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
    patch: { nickname?: string; bio?: string }
  ): Promise<User | null> {
    if (patch.nickname !== undefined && patch.bio !== undefined) {
      await this.db
        .prepare("UPDATE users SET nickname = ?, bio = ? WHERE id = ?")
        .bind(patch.nickname, patch.bio, id)
        .run();
    } else if (patch.nickname !== undefined) {
      await this.db
        .prepare("UPDATE users SET nickname = ? WHERE id = ?")
        .bind(patch.nickname, id)
        .run();
    } else if (patch.bio !== undefined) {
      await this.db
        .prepare("UPDATE users SET bio = ? WHERE id = ?")
        .bind(patch.bio, id)
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
      conds.push("(p.title LIKE ? OR p.content LIKE ?)");
      const like = `%${opts.q}%`;
      params.push(like, like);
    }
    if (opts.tag) {
      conds.push("p.tags LIKE ?");
      params.push(`%"${opts.tag}"%`);
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
        `SELECT p.*, u.nickname AS author_nickname,
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
        `SELECT p.*, u.nickname AS author_nickname,
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
    await this.db.prepare("DELETE FROM replies WHERE post_id = ?").bind(id).run();
  }

  async listReplies(postId: string): Promise<Reply[]> {
    const { results } = await this.db
      .prepare(
        `SELECT r.*, u.nickname AS author_nickname
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
    const totalRow = await this.db
      .prepare("SELECT COUNT(*) AS n FROM replies WHERE post_id = ?")
      .bind(postId)
      .first();
    const total = Number((totalRow as { n: number }).n);
    const { results } = await this.db
      .prepare(
        `SELECT r.*, u.nickname AS author_nickname
         FROM replies r JOIN users u ON u.id = r.author_id
         WHERE r.post_id = ? ORDER BY r.created_at ASC LIMIT ? OFFSET ?`
      )
      .bind(postId, size, (p - 1) * size)
      .all();
    return { replies: results as Reply[], total };
  }
  async createReply(r: Reply): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO replies (id, post_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(r.id, r.post_id, r.author_id, r.content, r.created_at)
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
        `SELECT p.*, u.nickname AS author_nickname,
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
         FROM notifications n JOIN users u ON u.id = n.actor_id
         WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`
      )
      .bind(userId, limit)
      .all();
    return results as Notification[];
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
    patch: { nickname?: string; bio?: string }
  ): Promise<User | null> {
    const db = await readJson();
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    if (patch.nickname !== undefined) u.nickname = patch.nickname;
    if (patch.bio !== undefined) u.bio = patch.bio;
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
    db.posts = db.posts.filter((p) => p.id !== id);
    db.replies = db.replies.filter((r) => r.post_id !== id);
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
      }));
  }
  async listRepliesPage(
    postId: string,
    page: number,
    pageSize: number
  ): Promise<{ replies: Reply[]; total: number }> {
    const db = await readJson();
    const all = db.replies
      .filter((r) => r.post_id === postId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({
        ...r,
        author_nickname: db.users.find((u) => u.id === r.author_id)?.nickname ?? "匿名",
      }));
    const total = all.length;
    const p = Math.max(page, 1);
    const size = Math.min(Math.max(pageSize, 1), 100);
    return { replies: all.slice((p - 1) * size, p * size), total };
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
    db.replies = db.replies.filter((r) => r.id !== id);
    await writeJson(db);
  }
  async toggleLike(
    postId: string,
    userId: string
  ): Promise<{ liked: boolean; likes: number }> {
    const db = await readJson();
    const p = db.posts.find((x) => x.id === postId);
    if (!p) return { liked: false, likes: 0 };
    const idx = (db as unknown as { likes?: { post_id: string; user_id: string }[] }).likes ?? [];
    const liked = idx.some((l) => l.post_id === postId && l.user_id === userId);
    if (liked) {
      p.likes = Math.max((p.likes ?? 1) - 1, 0);
      const filtered = idx.filter((l) => !(l.post_id === postId && l.user_id === userId));
      (db as unknown as { likes: typeof idx }).likes = filtered;
    } else {
      p.likes = (p.likes ?? 0) + 1;
      idx.push({ post_id: postId, user_id: userId });
    }
    await writeJson(db);
    return { liked: !liked, likes: p.likes ?? 0 };
  }
  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    const db = await readJson();
    const idx = (db as unknown as { likes?: { post_id: string; user_id: string }[] }).likes ?? [];
    return idx.some((l) => l.post_id === postId && l.user_id === userId);
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
    const count = favs.filter((f) => f.post_id === postId).length;
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
}

/* ================= 工具函数 ================= */

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

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
