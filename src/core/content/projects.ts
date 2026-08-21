import { getCollection } from "astro:content";
import type { Project } from "./types";

export async function getProjects(): Promise<Project[]> {
  const entries = await getCollection("projects");
  return entries.map(({ id, slug, data }) => ({ id, slug, ...data }));
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((project) => project.slug === slug);
}
