import { getCollection } from "astro:content";
import type { TimelineEvent } from "./types";

export async function getTimeline(): Promise<TimelineEvent[]> {
  const entries = await getCollection("timeline");
  return entries
    .map(({ id, data }) => ({ id, ...data }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
