export const routes = {
  home: "/",
  archive: "/archive",
  projects: "/projects",
  project: (slug: string) => `/projects/${slug}`,
  timeline: "/timeline",
  now: "/now",
  about: "/about",
  post: (slug: string) => `/posts/${slug}`
} as const;
