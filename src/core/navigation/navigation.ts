import { routes } from "@core/routing";

export const navigation = [
  { id: "archive", href: routes.archive },
  { id: "projects", href: routes.projects },
  { id: "timeline", href: routes.timeline },
  { id: "now", href: routes.now },
  { id: "about", href: routes.about }
] as const;

export const systemNavigation = [
  { id: "personnel", href: routes.personnel },
  { id: "logs", href: routes.archive },
  { id: "creations", href: routes.creations },
  { id: "collections", href: routes.collections },
  { id: "sites", href: routes.sites }
] as const;