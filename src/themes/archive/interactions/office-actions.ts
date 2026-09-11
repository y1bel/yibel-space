import type { ModuleId } from "./office-scene";
export const clampProgress = (value: number) => Math.max(0, Math.min(1, value));
/** Acceptance is geometric; releasing a card elsewhere never opens personnel. */
export function acceptsCard(localX: number, localZ: number) { return Math.abs(localX) <= 0.58 && Math.abs(localZ) <= 0.42; }
export function gestureProgress(module: ModuleId, input: { dx: number; dy: number; dz: number; heldMs: number; base: number; angle?: number }) {
  switch (module) {
    case "logs": return clampProgress(input.base - input.dy / 110);
    case "collections": return clampProgress(input.base + input.dz / 0.86);
    case "creations": return clampProgress(input.base + (input.angle === undefined ? input.dx / 150 : input.angle / (Math.PI * 1.5)));
    case "sites": return clampProgress(Math.max(-input.dy / 95, Math.hypot(input.dx, input.dy) < 7 ? input.heldMs / 950 : 0));
    default: return 0;
  }
}
