export type ArchiveBackground =
  | { type: "css"; preset?: "archive-ambient" }
  | { type: "image" | "gif"; src: string }
  | { type: "video"; src: string; poster?: string };

/**
 * Replace this with a public asset path when visual media is ready.
 * Image and GIF files use `src`; video also supports an optional `poster`.
 */
export const archiveSystemConfig = {
  entryMark: "Y",
  entryTitle: "YIBEL",
  entrySubtitle: "ARCHIVE",
  background: { type: "css", preset: "archive-ambient" } satisfies ArchiveBackground,
  hud: {
    weather: "OVERCAST // 18°C",
    region: "SECTOR A-001",
    clock: "LOCAL TIME",
    network: "PRIVATE LINK / ONLINE"
  }
} as const;