import { getCollection } from "astro:content";
import type { PostView, RenderedPost } from "./types";

async function getPublishedPostEntry(slug: string) {
  const entries = await getCollection("posts", ({ data }) => !data.draft);
  return entries.find((entry) => entry.slug === slug);
}

export async function getPosts(): Promise<PostView[]> {
  const entries = await getCollection("posts", ({ data }) => !data.draft);
  return entries
    .map(({ id, slug, data }) => {
      const { themes, ...post } = data;
      return { id, slug, ...post, themeExtensions: themes };
    })
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function getPostBySlug(slug: string): Promise<PostView | undefined> {
  const entry = await getPublishedPostEntry(slug);
  if (!entry) {
    return undefined;
  }

  const { themes, ...post } = entry.data;
  return { id: entry.id, slug: entry.slug, ...post, themeExtensions: themes };
}

export async function getRenderedPostBySlug(slug: string): Promise<RenderedPost | undefined> {
  const entry = await getPublishedPostEntry(slug);
  if (!entry) {
    return undefined;
  }

  const { Content } = await entry.render();
  const { themes, ...post } = entry.data;
  return {
    metadata: { id: entry.id, slug: entry.slug, ...post, themeExtensions: themes },
    body: Content
  };
}