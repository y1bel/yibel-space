import archiveTheme from "@themes/archive";
import testTheme from "@themes/test-theme";

export const themeRegistry = {
  archive: archiveTheme,
  test: testTheme
} as const;

export type ThemeId = keyof typeof themeRegistry;
