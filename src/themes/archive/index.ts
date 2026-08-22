import PlaceholderPage from "./components/PlaceholderPage.astro";
import { manifest } from "./manifest";
import type { ThemeDefinition } from "@core/theme";
import HomePage from "./pages/HomePage.astro";
import ArchivePage from "./pages/ArchivePage.astro";
import PostPage from "./pages/PostPage.astro";
import PersonnelPage from "./pages/PersonnelPage.astro";
import SystemModulePage from "./pages/SystemModulePage.astro";

const archiveTheme: ThemeDefinition = {
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
  metadata: { description: manifest.description, author: manifest.author },
  features: manifest.supports,
  pages: {
    home: HomePage,
    archive: ArchivePage,
    projects: PlaceholderPage,
    project: PlaceholderPage,
    timeline: PlaceholderPage,
    now: PlaceholderPage,
    about: PlaceholderPage,
    post: PostPage,
    personnel: PersonnelPage,
    systemModule: SystemModulePage
  }
};

export { manifest };
export default archiveTheme;