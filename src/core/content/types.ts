import type { AstroComponentFactory } from "astro/runtime/server/index.js";

export interface Post {
  id: string;
  slug: string;
  title: string;
  description?: string;
  publishedAt: Date;
  updatedAt?: Date;
  tags: string[];
  category?: string;
  cover?: string;
  draft: boolean;
}

export interface RenderedPost {
  metadata: Post;
  body: AstroComponentFactory;
}

export type ProjectStatus = "idea" | "active" | "paused" | "done" | "archived";

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: ProjectStatus;
  startedAt?: Date;
  finishedAt?: Date;
  stack: string[];
  cover?: string;
  links?: {
    github?: string;
    demo?: string;
    docs?: string;
  };
}

export type TimelineType = "project" | "travel" | "life" | "learning" | "work" | "other";

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: TimelineType;
  related?: {
    type: "post" | "project";
    slug: string;
  };
}
