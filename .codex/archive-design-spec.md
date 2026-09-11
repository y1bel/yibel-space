# Archive Theme Design Spec

Use this file as the durable design/architecture contract for Yibel Space's Archive Theme.

## Product intent

Yibel Space is a private archive/world, not a resume, blog index, portfolio grid, SaaS dashboard, or generic developer homepage.

The Archive Theme should feel like entering a restrained institutional system: archival, brutalist, governmental/research-facility-like, spatial, mysterious, documentary, game-adjacent, and original.

Avoid cyberpunk, neon, holograms, glassmorphism, SaaS cards, generic portfolio tiles, glowing HUD clutter, circuit lines, and decorative sci-fi noise.

Primary palette: warm white, pale stone, concrete gray, graphite/black. Deep red is sparse and reserved for active/status/anomaly/focus states.

## Information model

Primary modules:

- `personnel` -> Personnel / 人员档案
- `logs` -> Logs / 运行日志
- `creations` -> Creations / 创造物
- `collections` -> Collections / 收藏库
- `sites` -> Sites / 关联站点

Home is the world/hub, not a first-level menu item.

System Menu is a pause/system layer, not a navbar.

Record/detail pages should feel like extracting a real file/document from the system.

## Architecture contract

Preserve the repository architecture:

`Core -> Theme -> Pages`

Core owns shared semantics such as navigation and locale messages. Archive-only presentation, Three.js scene logic, Archive materials, Archive interactions, and Archive page styling stay inside `src/themes/archive/`.

Do not introduce React/Vue or a second app architecture.

## Three.js vs DOM responsibilities

Three.js owns:

- world geometry
- materials and lighting
- physical object motion
- camera/parallax
- raycasting
- object hit areas
- 3D-to-screen anchor projection

DOM/Astro/CSS owns:

- text
- labels
- System Menu
- locale-visible copy
- readable content
- module pages

Do not render navigation/body copy into WebGL.

## Home office (updated user direction)

The latest brief replaces wall-mounted and freestanding archive machines with a personal office. One working desk is the spatial anchor; objects are useful, recognizable belongings rather than five sculptural entrances. Preserve negative space, quiet daylight, a desk lamp, paper, restrained green enamel and worn wood.

- Personnel: a loose access card and reader. Pick up and insert, or drag into the reader. A misplaced card returns to the desk. This is a navigation metaphor, not security authentication.
- Logs: the central bound record book. Open its hinged cover, then retrieve/read a page.
- Collections: a shallow desktop card catalogue. Pull the actual drawer toward the viewer.
- Creations: a screw-driven assembly jig with a part being fitted. Rotate the handwheel to close the clamp and seat the part.
- Sites: a telephone. Lift the receiver upward or hold it briefly to connect outside the archive.

Desktop keeps stored/personal objects left, the record book central, making/communication right. Mobile rearranges these same objects along a narrower desk, rather than pushing the camera so far away that objects disappear. Camera bounds and fog must be tested at narrow aspect ratios.

## Motion and affordances

Idle objects are still. Hover or keyboard focus outlines the actual object's geometry and shows one restrained DOM annotation. No floating red dots or reticles. Red is reserved for the reader's physical status indicator.

Manipulation changes the relevant physical component, not a generic object scale or lift. Partial gestures can be cancelled; route handoff follows completion. A contextual DOM action button and keyboard provide equivalent operation for every gesture. Escape cancels and resets. Respect pointer capture, cancellation, reduced motion and navigation cleanup.

System Menu freezes object/camera motion, while a very faint outline links its selected row to the corresponding object. SystemShell remains the sole owner of directory state.

## Camera

Desktop-first. Keep mouse parallax subtle. Do not rotate the camera enough to destabilize the composition or cause discomfort.

Focus can shift target slightly. Activate can dolly a short distance toward the object.

Respect `prefers-reduced-motion`: greatly reduce parallax/idle motion and shorten transitions without breaking navigation.

## Materials and rendering

Prefer physically plausible, restrained materials:

- concrete/stone: high roughness, near-zero metalness
- metal: medium roughness, higher metalness
- glass/screen: subtle and limited
- emissive: only central seams, small active indicators, and tiny internal light sources

No global bloom-heavy look.

Renderer should use sensible quality limits: capped device pixel ratio, correct resize handling, reasonable shadow maps, and minimal post-processing.

## Labels and reticle

World labels are restrained annotations, not HUD panels.

Use thin typography, generous spacing, no reticle or floating status dots.

Projected labels must handle resize and stay on-screen. Avoid per-frame `innerHTML` updates and layout thrashing.

## System Menu

The System Menu is a pause/system layer with a light, mostly opaque surface over a frozen/dimmed world.

Do not number items.

Do not show English and Chinese at the same time.

Only show the currently active locale:

Chinese: 人员档案 / 运行日志 / 创造物 / 收藏库 / 关联站点

English: PERSONNEL / LOGS / CREATIONS / COLLECTIONS / SITES

Menu state rules on Home:

- `Tab` toggles the menu.
- First-ever open selects Personnel.
- Later opens restore `yibel-last-module`.
- `SystemShell` is the single menu state owner. HomeWorld must not duplicate Tab menu control.

## i18n

Reuse `src/core/i18n/` and the existing runtime locale mechanism.

Do not create a second locale store or duplicate bilingual labels.

All visible Home/Menu copy must react to the current locale.

## Routes and Entry

Keep the current root `/` Entry flow intact.

The Three.js Archive world belongs at `/home`.

Do not replace the Entry page with the 3D world.

## Module page direction

- Personnel: personnel file, not resume.
- Logs: archive index with Research / Fragments / Timeline.
- Creations: created-object/inventory registry, not portfolio cards.
- Collections: personal codex/database with personal notes.
- Sites: external connected nodes with obvious external-link affordance.
- Record: extracted paper/archive document with strong reading ergonomics.

## Astro lifecycle and performance

Archive Three.js code must survive Astro navigation/re-entry without duplicate renderers or listeners.

Ensure cleanup for:

- requestAnimationFrame
- pointer/resize/keyboard listeners owned by the scene
- renderer
- geometries/materials/textures created by the scene

Avoid giant textures, unnecessary post-processing, excessive shadow casters, or per-frame DOM churn.

## Non-goals

Do not:

- rewrite the project architecture
- remove the Entry flow
- introduce React/Vue/Tailwind/UI libraries
- add unrelated dependencies
- create a second i18n system
- reintroduce menu numbering
- show bilingual menu labels simultaneously
- build five equal world buttons
- use excessive glow/HUD effects
- fake physicality with only box-shadows and CSS transforms
