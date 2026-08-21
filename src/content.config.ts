import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false)
  })
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(["idea", "active", "paused", "done", "archived"]),
    startedAt: z.coerce.date().optional(),
    finishedAt: z.coerce.date().optional(),
    stack: z.array(z.string()).default([]),
    cover: z.string().optional(),
    links: z.object({
      github: z.string().url().optional(),
      demo: z.string().url().optional(),
      docs: z.string().url().optional()
    }).optional()
  })
});

const timeline = defineCollection({
  type: "content",
  schema: z.object({
    date: z.string(),
    title: z.string(),
    description: z.string().optional(),
    type: z.enum(["project", "travel", "life", "learning", "work", "other"]),
    related: z.object({
      type: z.enum(["post", "project"]),
      slug: z.string()
    }).optional()
  })
});

export const collections = { posts, projects, timeline };
