import { themeConfig } from "@config/theme";
import { themeRegistry, type ThemeId } from "./registry";
import type { ThemeDefinition } from "./types";

const fallbackTheme: ThemeId = "archive";

export function getActiveTheme(themeId: string = themeConfig.defaultTheme): ThemeDefinition {
  return themeRegistry[themeId as ThemeId] ?? themeRegistry[fallbackTheme];
}
