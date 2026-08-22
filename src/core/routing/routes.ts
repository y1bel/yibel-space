export const routes = {
  entry: "/",
  home: "/home",
  archive: "/archive",
  projects: "/projects",
  project: (slug: string) => `/projects/${slug}`,
  timeline: "/timeline",
  now: "/now",
  about: "/about",
  post: (slug: string) => `/posts/${slug}`,
  personnel: "/personnel",
  creations: "/creations",
  collections: "/collections",
  sites: "/sites"
} as const;