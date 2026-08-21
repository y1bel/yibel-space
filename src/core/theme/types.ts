export type ThemePageComponent = any;

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
    home: ThemePageComponent;
    archive: ThemePageComponent;
    projects: ThemePageComponent;
    project: ThemePageComponent;
    timeline: ThemePageComponent;
    now: ThemePageComponent;
    about: ThemePageComponent;
    post: ThemePageComponent;
  };
  metadata?: {
    description?: string;
    author?: string;
  };
  features?: ThemeFeatures;
}
