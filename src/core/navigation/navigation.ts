import { routes } from "@core/routing";

export const navigation = [
  { id: "archive", href: routes.archive },
  { id: "projects", href: routes.projects },
  { id: "timeline", href: routes.timeline },
  { id: "now", href: routes.now },
  { id: "about", href: routes.about }
] as const;
