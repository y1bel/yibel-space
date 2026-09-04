# Archive Home V11 Task

Read `.codex/archive-design-spec.md` first. Treat it as the durable design contract.

This task is specifically for branch `feat/archive-home-three-v11`.

## Goal

Make the current Archive `/home` Three.js implementation production-viable inside the existing Astro project, then perform one focused visual/interaction refinement pass on the Home world.

Do not redesign the entire website. Do not merge the PR.

## Required workflow

1. Inspect the current branch and relevant project structure.
2. Read:
   - `package.json`
   - `package-lock.json`
   - `tsconfig.json`
   - `src/core/i18n/**`
   - `src/core/navigation/**`
   - `src/themes/archive/components/SystemShell.astro`
   - `src/themes/archive/components/HomeWorld.astro`
   - `src/themes/archive/interactions/home-world.ts`
   - `src/themes/archive/styles/home-world.css`
   - `src/themes/archive/pages/HomePage.astro`
   - root Entry flow under `/`
3. Run `npm install` so `three` and the lockfile are correctly synchronized.
4. Remove any temporary whole-module Three.js typing workaround such as `declare module "three";` if present. Use Three.js normal TypeScript types instead of masking errors with `any`/`@ts-ignore`.
5. Run `npm run check` and `npm run build`.
6. Fix all errors caused by the Three.js Home work: Astro, TypeScript, imports, DOM typing, bundling, lifecycle, or runtime issues.
7. If browser/dev-server access is available, run the app and test `/home` directly.
8. Only after the implementation is stable, do the visual/interaction refinement described below.
9. Run `npm run check` and `npm run build` again before finishing.

## Home refinement for this pass

Keep the five semantic modules, but make the physical forms and placement read more clearly and less randomly.

### Composition

Preserve the spatial hierarchy from the design spec:

- left foreground: Personnel
- left lower/back: Collections
- center: Logs, clearly dominant
- right foreground: Creations
- right rear/wall: Sites

Do not align them as five equal entrances. Preserve generous negative space.

### Object design

Refine existing procedural Three.js meshes rather than rebuilding the project around imported models.

Personnel should read more clearly as a physical dossier/identity file apparatus.

Collections should visibly read as storage/drawers, with one real drawer-part interaction.

Logs should remain the strongest central split archive terminal/monolith. Its shell/seam/access mechanism should be visually coherent and simple.

Creations should read as an artifact display/alignment/construction apparatus, not merely a ring with a floating arbitrary rock. Give the center artifact and outer mechanism an understandable relationship.

Sites should move/read as a peripheral wall-mounted external connection node, not another floor sculpture.

### Interaction

Keep real Three.js raycasting.

For each object ensure:

- hit area matches the visible object
- hover/focus is stable and does not flicker
- focus uses an object-specific mechanical response
- activation has a short physical sequence before navigation
- keyboard focus + Enter remains usable
- touch/click remains usable

Camera motion must remain subtle. Do not add dramatic game-camera movement.

### Labels / UI

Use projected DOM labels/reticle, but keep them restrained.

Ensure labels/reticle stay within viewport bounds after resize and do not become large HUD cards.

Do not re-add module numbers.

Do not display both languages at once.

Reuse the current locale system and `data-yt-copy`/localeMessages behavior.

## System Menu requirements

`SystemShell` remains the single owner of menu state.

Home requirements:

- `Tab` toggles the menu.
- first-ever menu open selects Personnel
- later opens restore `yibel-last-module`
- no duplicate HomeWorld `Tab` handler that causes double toggles
- no numbered menu
- only current locale is visible

Keep the existing root `/` Entry flow unchanged.

## Lifecycle / performance checks

Verify that Astro navigation or component re-entry does not create duplicate renderers/listeners/RAF loops.

Clean up scene-owned resources where appropriate:

- RAF
- resize / pointer listeners
- renderer
- scene-created geometry/material/texture resources

Cap `devicePixelRatio` to a sensible desktop value. Avoid unnecessary post-processing and excessive shadow work.

Support `prefers-reduced-motion` by reducing parallax/idle motion/activation duration while keeping navigation functional.

## Runtime verification checklist

If a browser is available, verify at minimum:

- `/home` renders without console errors
- all five entities render
- raycaster hover/focus is stable
- Personnel interaction is semantically readable
- Collections drawer moves
- Logs focus and activation work
- Creations mechanism/artifact relationship reads clearly
- Sites reads as an external/peripheral node
- click activation works
- keyboard focus + Enter works
- `Tab` menu toggle works once per keypress
- first Menu state selects Personnel
- last module restoration works
- language switching updates menu and Home labels without simultaneous bilingual labels
- resize works
- refresh works
- leaving and returning to `/home` does not duplicate scene behavior

If browser access is not available, say so explicitly rather than claiming visual verification.

## Completion criteria

Do not stop at "implemented". Finish only when:

- dependencies/lockfile are synchronized
- `npm run check` passes
- `npm run build` passes
- no temporary whole-module Three.js type shim remains
- architecture still follows Core -> Theme -> Pages
- root Entry flow still works structurally
- Home Menu i18n remains single-language
- object layout/semantics have received one real refinement pass
- no unrelated framework/dependency was introduced

## Final report

Return a compact report with:

### Completed
What was fixed/refined.

### Visual / Interaction Changes
Object forms, layout, camera, focus, activation.

### Architecture / i18n
How the implementation remains integrated with the existing repository.

### Verification
- `npm run check`: PASS/FAIL
- `npm run build`: PASS/FAIL
- browser runtime: VERIFIED/NOT VERIFIED

### Changed Files
Exact file list.

### Remaining Issues
Only real unresolved issues.

Do not merge the PR and do not ask for confirmation unless blocked by credentials, destructive operations, or unavailable required inputs.
