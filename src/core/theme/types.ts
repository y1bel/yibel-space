import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type {
  AboutPageData,
  ArchivePageData,
  HomePageData,
  NowPageData,
  PostPageData,
  ProjectPageData,
  ProjectsPageData,
  TimelinePageData
} from "./page-data";

export type ThemePageComponent<PageData> = AstroComponentFactory & {
  readonly pageData?: PageData;
};

export interface ThemeFeatures {
  darkMode?: boolean;
  customCursor?: boolean;
  pageTransitions?: boolean;
  sound?: boolean;
  keyboardNavigation?: boolean;
  reducedMotion?: boolean;
  mobile?: boolean;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  version: string;
  pages: {
    home: ThemePageComponent<HomePageData>;
    archive: ThemePageComponent<ArchivePageData>;
    projects: ThemePageComponent<ProjectsPageData>;
    project: ThemePageComponent<ProjectPageData>;
    timeline: ThemePageComponent<TimelinePageData>;
    now: ThemePageComponent<NowPageData>;
    about: ThemePageComponent<AboutPageData>;
    post: ThemePageComponent<PostPageData>;
  };
  metadata?: {
    description?: string;
    author?: string;
  };
  features?: ThemeFeatures;
}
