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

export interface Post {
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

export type PostInput = Omit<Post, "id"> & { id?: string };
