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
  reply_count?: number;
  board_name?: string;
  view_count?: number;
  likes?: number;
  sticky?: number;
  attachments?: string[];
}

export interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_nickname?: string;
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
