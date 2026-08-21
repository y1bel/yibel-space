import { getCollection } from "astro:content";
import type { Post, RenderedPost } from "./types";

async function getPublishedPostEntry(slug: string) {
  const entries = await getCollection("posts", ({ data }) => !data.draft);
  return entries.find((entry) => entry.slug === slug);
}

export async function getPosts(): Promise<Post[]> {
  const entries = await getCollection("posts", ({ data }) => !data.draft);
  return entries
    .map(({ id, slug, data }) => ({ id, slug, ...data }))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const entry = await getPublishedPostEntry(slug);
  return entry && { id: entry.id, slug: entry.slug, ...entry.data };
}

export async function getRenderedPostBySlug(slug: string): Promise<RenderedPost | undefined> {
  const entry = await getPublishedPostEntry(slug);
  if (!entry) {
    return undefined;
  }

  const { Content } = await entry.render();
  return {
    metadata: { id: entry.id, slug: entry.slug, ...entry.data },
    body: Content
  };
}
