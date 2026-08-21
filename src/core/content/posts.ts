import { getCollection } from "astro:content";
import type { Post } from "./types";

export async function getPosts(): Promise<Post[]> {
  const entries = await getCollection("posts", ({ data }) => !data.draft);
  return entries
    .map(({ id, slug, data }) => ({ id, slug, ...data }))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const posts = await getPosts();
  return posts.find((post) => post.slug === slug);
}
