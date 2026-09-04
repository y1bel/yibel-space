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

## Home world spatial hierarchy

The world must not read as five equal buttons.

Spatial meaning:

- left = SELF / STORED
- center = RECORD / ACTIVE CORE
- right = CREATED / EXTERNAL

Visual hierarchy:

1. `LOGS` is the largest and primary focal object in the center.
2. `PERSONNEL` and `CREATIONS` are medium secondary objects.
3. `COLLECTIONS` and `SITES` are smaller tertiary objects.

Use substantial negative space. The scene should feel calm and intentional, not like a game level or exhibition hall.

### PERSONNEL

Location: left foreground.

Physical metaphor: dossier stand, identity file apparatus, personnel archive frame, registration cradle.

It should read as a physical file/identity mechanism rather than an abstract sculpture.

Focus motion: a file layer, panel, or sheet subtly opens/rotates; camera can bias slightly left.

Activate motion: continue the file-reading action before navigation.

### COLLECTIONS

Location: left, lower and/or slightly behind Personnel.

Physical metaphor: archive drawers, specimen storage, collection cabinet.

It must visibly contain storage units.

Focus/activate motion should move an actual drawer or storage element, not the whole object.

### LOGS

Location: center. Primary visual anchor.

Physical metaphor: split archive monolith, record terminal, active record-processing core.

It may use split shells around a central seam/core, but should remain simple, stable, and architectural—not a normal computer or sci-fi console.

Idle: extremely subtle internal breathing/mechanical motion.

Focus: seam brightens slightly, shell feels unlocked, camera aligns.

Activate: shell separates, internal access structure appears, camera dollies forward, then route/system transition occurs.

### CREATIONS

Location: right foreground.

Physical metaphor: artifact registry, prototype display, making/alignment apparatus.

Avoid a meaningless ring + floating rock. The device should imply measuring, displaying, aligning, or constructing a created object.

Focus: mechanism calibrates; artifact may float/rotate very slowly.

Activate: structural elements align/separate and the artifact responds before navigation.

### SITES

Location: right rear, edge, or wall-mounted.

Physical metaphor: external port, communication node, uplink, routing junction.

It represents connection outside the local archive, so it should feel spatially peripheral.

Focus/activate: restrained connector/port alignment or status response.

Do not make it another floor sculpture.

## Motion model

Every world object has three states:

- IDLE
- FOCUS
- ACTIVATE

### IDLE

Very quiet. Long-duration micro motion only: camera breathing, tiny seam pulse, artifact drift, minimal mechanism settling.

Do not make every object continuously move.

### FOCUS

Triggered by real Three.js raycasting or keyboard focus.

Expected sequence:

1. focus locks to object
2. projected DOM reticle/label moves to its anchor
3. object-specific mechanical response occurs
4. camera target subtly biases toward it
5. non-focused objects may lose a small amount of attention

Typical duration: ~220–380ms.

Never use generic `translateY(-6px)` as the primary interaction.

### ACTIVATE

Click/Enter should feel like operating a physical game-world object.

Typical sequence:

- 0ms: focus lock
- ~80ms: status response
- ~150–450ms: object-specific mechanism
- ~350–650ms: short camera dolly
- ~550–800ms: navigation/system handoff

Use restrained easing and damping.

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

Use thin typography, generous spacing, minimal focus brackets, and a tiny red point if needed.

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
