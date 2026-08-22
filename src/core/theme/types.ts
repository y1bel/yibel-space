import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type {
  AboutPageData,
  ArchivePageData,
  HomePageData,
  NowPageData,
  PersonnelPageData,
  PostPageData,
  ProjectPageData,
  ProjectsPageData,
  SystemModulePageData,
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
    personnel: ThemePageComponent<PersonnelPageData>;
    systemModule: ThemePageComponent<SystemModulePageData>;
  };
  metadata?: {
    description?: string;
    author?: string;
  };
  features?: ThemeFeatures;
}