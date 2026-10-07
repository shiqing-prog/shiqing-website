export interface Project {
  id: string;
  title: string;
  description: string;
  tech: string[];
  link?: string;
  github?: string;
  featured: boolean;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  tags: string[];
  published: boolean;
}

export type ProjectInput = Omit<Project, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export type BlogPostInput = Omit<BlogPost, "id"> & { id?: string };

/* ---------- BBS / 用户 / 文件 ---------- */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  nickname: string;
  bio: string;
  role: "user" | "admin";
  created_at: string;
  email_verified?: number;
  verify_token?: string | null;
  verify_token_expires?: string | null;
  /** 头像：文件库文件 id（可空，空则显示昵称首字） */
  avatar?: string | null;
  /** 密码重置 token 与过期时间 */
  reset_token?: string | null;
  reset_token_expires?: string | null;
  /** 邮件通知开关（回复/@提及 时发邮件提醒，1 开启） */
  notify_email?: number;
  /** 通过卡密兑换得到的账号权益（'free' = 无） */
  plan?: string;
  /** 权益到期时间（秒级时间戳，0 = 未激活） */
  plan_expires_at?: number;
  /** 权益剩余次数（0 = 不限） */
  plan_quota?: number;
  /** 权益已使用次数 */
  plan_used?: number;
}

export type PublicUser = Omit<User, "password_hash">;

export interface Session {
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface Board {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  post_count?: number;
}

export interface BbsPost {
  id: string;
  board_id: string;
  author_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_nickname?: string;
  author_avatar?: string | null;
  reply_count?: number;
  board_name?: string;
  view_count?: number;
  likes?: number;
  sticky?: number;
  attachments?: string[];
  tags?: string[];
}

export interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_nickname?: string;
  author_avatar?: string | null;
  /** 父回复 id（楼中楼），顶层回复为 null */
  parent_id?: string | null;
  /** 被回复用户 id（子回复） */
  reply_to_user_id?: string | null;
  /** 被回复人昵称（子回复展示"回复 @xxx"） */
  reply_to_nickname?: string;
  /** 回复点赞数 */
  likes?: number;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  post_id: string | null;
  reply_id: string | null;
  content: string;
  is_read: number;
  created_at: string;
  actor_nickname?: string;
}

export interface FileRecord {
  id: string;
  filename: string;
  size: number;
  mime: string;
  uploader_id: string | null;
  created_at: string;
  uploader_nickname?: string;
  url?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
}

/* ---------- 站内私信 ---------- */

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: number;
  created_at: string;
  sender_nickname?: string;
}

export interface Conversation {
  userId: string;
  nickname: string;
  lastContent: string;
  lastAt: string;
  unread: number;
  avatar?: string | null;
}

/* ---------- 帖子投票（Poll） ---------- */

export interface PollResult {
  options: string[];
  /** 每个选项的票数（与 options 对齐） */
  votes: number[];
  total: number;
  /** 当前用户已选项（未投为 null） */
  myChoice: number | null;
}

/* ---------- 站内公告 ---------- */

export interface Announcement {
  id: string;
  content: string;
  created_at: string;
  expires_at: string | null;
}

/* ---------- 卡密系统（分发与验证中心） ---------- */

export interface CardRecord {
  id?: number;
  card_key: string;
  prefix: string;
  plan: string;
  days: number;
  /** 0 = 不限次数 */
  quota: number;
  used: number;
  /** 首次消费时绑定，之后必须一致 */
  bound_qq: string;
  /** 被本站账号整卡兑换时绑定（与 bound_qq 互斥，二选一） */
  bound_user_id: string;
  /** 整卡兑换时间（秒级时间戳，0 = 未兑换） */
  redeemed_at: number;
  /** 整卡兑换批次令牌：claim 写入、grant 用同一令牌做 EXISTS 校验，
   *  避免「同秒并发」时 grant 误判为本次占用而重复发放权益 */
  redeem_token?: string;
  /** 秒级时间戳；0 = 未激活（首次消费时开始计时） */
  expired_at: number;
  created_at: number;
  used_at: number;
  /** 1 = 正常，0 = 已吊销 */
  status: number;
  remark: string;
  /** 列表查询时带出的绑定账号昵称（仅展示用） */
  bound_user_nickname?: string | null;
}

/** 账号权益（由卡密兑换叠加而来，落在 users 表的 plan_* 字段） */
export interface UserPlan {
  plan: string;
  /** 秒级时间戳，0 = 未激活 */
  expiresAt: number;
  /** 剩余次数，0 = 不限 */
  quota: number;
  used: number;
  /** 是否仍在有效期内 */
  active: boolean;
  /** 剩余天数（不足 1 天按 0 计，未激活为 0） */
  remainingDays: number;
}

/** 卡密申请（主页提交 → 管理员审核 → 通过后自动发卡） */
export interface CardRequest {
  id?: number;
  user_id: string;
  /** 期望套餐 */
  plan: string;
  /** 期望有效天数 */
  days: number;
  /** 期望次数上限（0 = 不限） */
  quota: number;
  /** 申请理由 */
  reason: string;
  /** 联系方式（QQ / 邮箱） */
  contact: string;
  /** 0 = 待审核，1 = 已通过，2 = 已拒绝 */
  status: number;
  /** 通过后发放的卡密 */
  card_key: string;
  /** 审核备注 / 拒绝理由 */
  review_note: string;
  reviewed_by: string;
  reviewed_at: number;
  created_at: number;
  /** 列表查询带出的申请人昵称（仅展示用） */
  user_nickname?: string | null;
}

export interface CardLogRecord {
  card_key: string;
  qq: string;
  action:
    | "verify"
    | "consume"
    | "generate"
    | "revoke"
    | "redeem"
    /** 账号权益按次消费（词库/计费端调用） */
    | "account_consume"
    /** 主页提交卡密申请 */
    | "request"
    /** 管理员通过申请（自动发卡） */
    | "request_approve"
    /** 管理员拒绝申请 */
    | "request_reject";
  ip: string;
  request_id: string;
  detail: string;
  created_at: number;
}

export interface CardStats {
  total: number;
  activated: number;
  used: number;
  expired: number;
  revoked: number;
  available: number;
}

/* ---------- 心理测评记录 ---------- */

export interface PsychResultRecord {
  id: string;
  user_id: string;
  scale_slug: string;
  total: number;
  max: number;
  level: string;
  level_key: string;
  type_code: string | null;
  /** JSON 数组字符串：每题所选原始分 */
  answers: string;
  created_at: string;
}
