import type { PostView, Project, RenderedPost, TimelineEvent } from "@core/content";

export interface HomePageData {
  kind: "home";
  recentPosts: PostView[];
  activeProjects: Project[];
  recentTimeline: TimelineEvent[];
}

export interface ArchivePageData {
  kind: "archive";
  posts: PostView[];
}

export interface ProjectsPageData {
  kind: "projects";
  projects: Project[];
}

export interface ProjectPageData {
  kind: "project";
  project: Project;
}

export interface TimelinePageData {
  kind: "timeline";
  timeline: TimelineEvent[];
}

export interface NowPageData { kind: "now"; }
export interface AboutPageData { kind: "about"; }
export interface PostPageData { kind: "post"; post: RenderedPost; }

export type PageData = HomePageData | ArchivePageData | ProjectsPageData | ProjectPageData | TimelinePageData | NowPageData | AboutPageData | PostPageData;