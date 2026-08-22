import { getCollection } from "astro:content";
import type { LogEntry, RenderedLog } from "./types";

async function getPublishedLogEntry(slug: string) {
  const entries = await getCollection("logs", ({ data }) => !data.draft);
  return entries.find((entry) => entry.slug === slug);
}

export async function getLogs(): Promise<LogEntry[]> {
  const entries = await getCollection("logs", ({ data }) => !data.draft);
  return entries
    .map(({ id, slug, data }) => ({ id, slug, ...data }))
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
}

export async function getRenderedLogBySlug(slug: string): Promise<RenderedLog | undefined> {
  const entry = await getPublishedLogEntry(slug);
  if (!entry) return undefined;

  const { Content } = await entry.render();
  return { metadata: { id: entry.id, slug: entry.slug, ...entry.data }, body: Content };
}