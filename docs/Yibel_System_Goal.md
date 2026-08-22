# Yibel System Goal: Personal Terminal Interface

## Overall Goal

Transform Yibel Space into a game-like personal terminal experience
inspired by Control-style UI, RPG menus, and sci-fi system interfaces.

This phase focuses on: - Loading screen - Homepage/world scene
placeholder - System menu - Personnel/Profile page placeholder - Logs
module foundation - Multilingual architecture - UI layout system

Do not implement all content details yet. Build the structure and
interaction framework first.

## System Identity

YIBEL SYSTEM // PERSONAL TERMINAL

## Main Menu

01 PERSONNEL 人员档案

02 LOGS 运行日志

03 CREATIONS 创造物

04 COLLECTIONS 收藏库

05 SITES 关联站点

## Menu Requirements

The menu should feel like an in-game system interface.

Requirements: - Main menu is horizontal at the top. - Items separated by
vertical divider lines. - Hover state becomes bright/white. - Selected
state is clearly highlighted. - Avoid normal website navbar
appearance. - Background scene freezes when menu opens. - Menu appears
above the frozen scene.

## Layout

Follow Control/RPG UI principles: - Large empty margins. - Centered
panels. - Floating interface elements. - Do not touch screen edges. -
Avoid normal full-width webpage layout.

## Modules

### PERSONNEL

Placeholder first.

Purpose: Character/profile/status page.

Future: - Identity - Skills - Equipment - Current Status - Technology
Stack - Contact

### LOGS

Must implement submenu and detail pages.

Submenu: - Research Logs - Notes / Fragments - Timeline View

Implement: - Logs list page - Log detail page

### CREATIONS

Placeholder only.

Future: - Open source projects - Applications - Experiments

### COLLECTIONS

Placeholder only.

Future: - Books - Games - Movies - Tools - Inspirations

### SITES

Placeholder only.

Future: - Personal websites - Developers - Creators - Communities

## Internationalization

Implement i18n.

Support: - zh-CN - en-US

UI text must come from language configuration.

System IDs and codes may remain English.

## Technical Constraints

-   Keep current theme architecture.
-   Do not break Core contracts.
-   Keep theme-specific data isolated.
-   Build reusable components.
-   Prepare for future animations.

## Acceptance Criteria

-   Loading screen exists.
-   Homepage/game scene placeholder exists.
-   Menu open/close works.
-   Top horizontal menu works.
-   Hover and active states match game UI.
-   Personnel placeholder exists.
-   Logs submenu works.
-   Logs list/detail works.
-   Empty modules exist for Creations, Collections, Sites.
-   i18n structure exists.
-   npm check/build pass.
