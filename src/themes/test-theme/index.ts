import PlaceholderPage from "./components/PlaceholderPage.astro";
import { manifest } from "./manifest";
import type { ThemeDefinition } from "@core/theme";

const testTheme: ThemeDefinition = {
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
  metadata: {
    description: manifest.description,
    author: manifest.author
  },
  features: manifest.supports,
  pages: {
    home: PlaceholderPage,
    archive: PlaceholderPage,
    projects: PlaceholderPage,
    project: PlaceholderPage,
    timeline: PlaceholderPage,
    now: PlaceholderPage,
    about: PlaceholderPage,
    post: PlaceholderPage
  }
};

export { manifest };
export default testTheme;
