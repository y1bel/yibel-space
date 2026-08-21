# Yibel Space — 技术设计文档（V1）

## 1. 项目概述

Yibel Space 是一个以 **Astro + TypeScript + Markdown/MDX + 少量 React + Cloudflare** 为基础的个人数字空间。

项目不是传统意义上的"博客主题"，而是一个：

> **内容内核稳定、主题表现可完全替换的个人数字空间系统。**

同一份内容可以在不同主题下，以完全不同的布局、交互、动画和视觉语言呈现。

主题不只是 CSS Skin，而是完整的 Presentation Layer。

例如：

- Archive：档案馆 / 索引 / 记录系统
- Desktop：桌面操作系统 / 窗口 / 文件夹
- Terminal：终端 / 命令行交互
- RPG：任务日志 / 存档 / 状态界面
- Editorial：杂志 / 大字号 / 摄影排版

这些主题读取的是同一份底层内容数据。

---

# 2. V1 核心目标

V1 只解决以下问题：

1. 建立稳定的内容层。
2. 建立主题注册与解析机制。
3. 路由与主题表现完全分离。
4. 内容新增时尽量不破坏旧主题。
5. 实现第一个完整主题：`archive`。
6. 实现一个极简 `test-theme`，验证主题可完全替换页面布局。
7. 支持 Markdown / MDX 内容。
8. 支持 Astro 静态生成。
9. 可部署到 Cloudflare。
10. 为未来主题扩展保留清晰接口。

V1 **不实现**：

- 完整插件系统
- Theme API 多版本兼容层
- CMS 后台
- 用户登录
- 数据库
- 动态服务端 API
- 第三方主题市场
- 在线主题安装
- 复杂主题继承机制

原则：

> 先让两个完全不同的主题成功运行，再根据真实需求抽象。

---

# 3. 技术栈

## Core

- Astro
- TypeScript

## Content

- Markdown
- MDX
- Astro Content Collections

## Interactive Components

优先：

- Astro Component

仅在确实需要客户端状态或复杂交互时使用：

- React

不要把整个网站做成 React SPA。

## Deployment

- GitHub
- Cloudflare

默认静态构建。

---

# 4. 总体架构

```text
                         Yibel Space

                             Core
                              │
             ┌────────────────┼────────────────┐
             │                │                │
          Content          Routing          Config
             │                │                │
             └────────────────┼────────────────┘
                              │
                         Theme Contract
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
       Archive             Desktop             Terminal
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                            Astro
                              │
                         Cloudflare
```

系统分为四层：

1. Content Layer
2. Core Layer
3. Theme Layer
4. Astro Entry Layer

---

# 5. 架构原则

## 5.1 Content 与 Theme 必须解耦

Theme 不允许直接读取 Markdown 文件。

禁止：

```ts
readFile(...)
glob(...)
fs.readFile(...)
```

出现在主题目录中。

Theme 只能通过 Core 暴露的数据接口获取内容。

例如：

```ts
const posts = await getPosts()
const projects = await getProjects()
```

目的：

未来即使 Markdown 替换为 CMS、API 或数据库，主题无需修改。

---

## 5.2 URL 属于 Core，不属于 Theme

无论当前主题是什么，URL 永远稳定。

例如：

```text
/
/archive
/projects
/projects/[slug]
/timeline
/now
/about
/posts/[slug]
```

禁止主题自行改变路由语义。

例如 Desktop Theme 不应该把：

```text
/posts/hello
```

改成：

```text
/files/documents/hello
```

Desktop 可以在视觉上表现为文件系统，但实际 URL 仍然是：

```text
/posts/hello
```

原因：

- SEO
- 分享链接
- 外部引用
- 历史链接
- RSS
- 搜索引擎索引

不能跟随主题变化。

---

## 5.3 Theme 是完整 Presentation Layer

Theme 不只是：

```text
theme.css
```

每个 Theme 可以独立拥有：

- Layout
- Components
- Page
- CSS
- Animation
- Interaction
- Navigation UI
- Cursor
- Sound
- React Components
- Assets

不同主题之间不要求复用 UI。

---

## 5.4 Core 定义真实语义，Theme 定义展示语义

例如 Core 中：

```ts
projects
```

Archive Theme 可以显示：

```text
PROJECTS
```

Desktop Theme 可以显示：

```text
Applications
```

RPG Theme 可以显示：

```text
Quests
```

但它们底层都读取：

```ts
getProjects()
```

---

## 5.5 Core API 尽量只增不删

内容系统新增能力时：

```text
posts
projects
books
photos
music
```

旧主题不要求自动支持新模块。

例如：

```ts
getBooks()
```

加入 Core 后，Archive Theme 如果没有调用它，应继续正常运行。

核心原则：

```text
新增内容类型    → 不破坏旧主题
新增可选字段    → 不破坏旧主题
新增页面        → 旧主题可以不展示
删除核心字段    → 尽量避免
重命名核心字段  → 尽量避免
修改核心 API    → 谨慎
```

---

# 6. 推荐目录结构

```text
yibel-space/
│
├─ src/
│  │
│  ├─ core/
│  │  │
│  │  ├─ content/
│  │  │  ├─ posts.ts
│  │  │  ├─ projects.ts
│  │  │  ├─ timeline.ts
│  │  │  ├─ notes.ts
│  │  │  └─ index.ts
│  │  │
│  │  ├─ routing/
│  │  │  ├─ routes.ts
│  │  │  └─ types.ts
│  │  │
│  │  ├─ theme/
│  │  │  ├─ types.ts
│  │  │  ├─ registry.ts
│  │  │  ├─ resolver.ts
│  │  │  └─ index.ts
│  │  │
│  │  ├─ navigation/
│  │  │  └─ navigation.ts
│  │  │
│  │  ├─ seo/
│  │  │  └─ metadata.ts
│  │  │
│  │  └─ utils/
│  │     ├─ date.ts
│  │     ├─ sort.ts
│  │     └─ collections.ts
│  │
│  ├─ content/
│  │  ├─ posts/
│  │  ├─ notes/
│  │  ├─ projects/
│  │  ├─ logs/
│  │  └─ pages/
│  │
│  ├─ themes/
│  │  │
│  │  ├─ archive/
│  │  │  ├─ components/
│  │  │  ├─ layouts/
│  │  │  ├─ pages/
│  │  │  ├─ interactions/
│  │  │  ├─ styles/
│  │  │  ├─ assets/
│  │  │  ├─ manifest.ts
│  │  │  └─ index.ts
│  │  │
│  │  └─ test-theme/
│  │     ├─ components/
│  │     ├─ layouts/
│  │     ├─ pages/
│  │     ├─ styles/
│  │     ├─ manifest.ts
│  │     └─ index.ts
│  │
│  ├─ shared/
│  │  ├─ types/
│  │  ├─ constants/
│  │  └─ utils/
│  │
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ archive.astro
│  │  ├─ projects/
│  │  │  ├─ index.astro
│  │  │  └─ [slug].astro
│  │  ├─ posts/
│  │  │  └─ [slug].astro
│  │  ├─ timeline.astro
│  │  ├─ now.astro
│  │  └─ about.astro
│  │
│  └─ config/
│     ├─ site.ts
│     └─ theme.ts
│
├─ public/
├─ astro.config.mjs
├─ tsconfig.json
├─ package.json
└─ README.md
```

---

# 7. 内容模型

优先使用 Astro Content Collections + Zod Schema。

## 7.1 Post

```ts
export interface Post {
  id: string
  slug: string

  title: string
  description?: string

  publishedAt: Date
  updatedAt?: Date

  tags: string[]
  category?: string

  cover?: string

  draft: boolean
}
```

Markdown Frontmatter 示例：

```yaml
---
title: "重新设计个人网站"
description: "关于 Yibel Space 新架构的记录"
publishedAt: 2026-08-21
tags:
  - Astro
  - Web
category: development
draft: false
---
```

---

# 8. Project 模型

```ts
export type ProjectStatus =
  | "idea"
  | "active"
  | "paused"
  | "done"
  | "archived"

export interface Project {
  id: string
  slug: string

  title: string
  description: string

  status: ProjectStatus

  startedAt?: Date
  finishedAt?: Date

  stack: string[]

  cover?: string

  links?: {
    github?: string
    demo?: string
    docs?: string
  }
}
```

---

# 9. Timeline 模型

```ts
export type TimelineType =
  | "project"
  | "travel"
  | "life"
  | "learning"
  | "work"
  | "other"

export interface TimelineEvent {
  id: string

  date: string

  title: string
  description?: string

  type: TimelineType

  related?: {
    type: "post" | "project"
    slug: string
  }
}
```

---

# 10. Notes / Logs

Notes 是轻量内容。

```ts
export interface Note {
  id: string
  slug: string

  title?: string
  content: string

  createdAt: Date

  tags: string[]
}
```

Logs 可以作为更偏时间线式的个人记录。

V1 可以先实现数据模型，不一定做独立页面。

---

# 11. Core Content API

主题禁止知道 Content Collections 的实现细节。

统一通过：

```ts
getPosts()
getPostBySlug()

getProjects()
getProjectBySlug()

getTimeline()

getNotes()
```

示例：

```ts
export async function getPosts(): Promise<Post[]> {
  // Astro Content Collection implementation
}
```

主题中只允许：

```ts
import { getPosts } from "@/core/content"
```

不允许：

```ts
import { getCollection } from "astro:content"
```

直接出现在 theme 内部。

---

# 12. Theme Contract

## 12.1 ThemeDefinition

建议 V1：

```ts
export interface ThemeDefinition {
  id: string
  name: string
  version: string

  pages: {
    home: unknown
    archive: unknown

    projects: unknown
    project: unknown

    timeline: unknown

    now: unknown
    about: unknown

    post: unknown
  }

  metadata?: {
    description?: string
    author?: string
  }

  features?: ThemeFeatures
}
```

---

## 12.2 ThemeFeatures

```ts
export interface ThemeFeatures {
  darkMode?: boolean

  customCursor?: boolean

  pageTransitions?: boolean

  sound?: boolean

  keyboardNavigation?: boolean

  reducedMotion?: boolean

  mobile?: boolean
}
```

注意：

`features` V1 只作为主题声明信息。

不要构建复杂 Feature Runtime。

---

# 13. Theme Manifest

每个主题必须有：

```text
manifest.ts
```

例如：

```ts
export const manifest = {
  id: "archive",
  name: "Archive",
  version: "0.1.0",

  author: "Yibel",

  description: "Archive-inspired personal digital space",

  supports: {
    darkMode: true,
    sound: false,
    mobile: true,
    reducedMotion: true
  }
}
```

未来 `/themes` 页面可以直接读取 Manifest。

---

# 14. Theme 注册机制

创建：

```text
src/core/theme/registry.ts
```

例如：

```ts
import archiveTheme from "@/themes/archive"
import testTheme from "@/themes/test-theme"

export const themeRegistry = {
  archive: archiveTheme,
  test: testTheme
} as const
```

不要 V1 就实现动态扫描或 npm 插件安装。

显式注册最简单、最可控。

---

# 15. Theme Resolver

优先级：

```text
URL 指定 Theme
        ↓
LocalStorage / Cookie
        ↓
站点默认 Theme
        ↓
Fallback Theme
```

但需要注意：

Astro 默认静态生成环境无法在服务端读取 LocalStorage。

因此 V1 推荐：

## 构建级默认主题

```ts
export const themeConfig = {
  defaultTheme: "archive"
}
```

## 预览 Theme

开发环境或预览页面可使用：

```text
/themes/archive
/themes/test
```

用户端动态整站切换可以放在后续版本。

V1 的重点是：

> 架构支持多主题，而不是立即实现无刷新动态整站切换。

---

# 16. Astro Pages 的职责

`src/pages` 仅负责：

1. 定义稳定 URL
2. 获取当前主题
3. 获取页面所需数据
4. 将数据交给 Theme Page

不要在 `src/pages` 中写具体 UI。

错误：

```astro
<h1>Archive</h1>

<ul>
  ...
</ul>
```

正确思路：

```astro
---
const theme = getActiveTheme()
const Page = theme.pages.archive

const posts = await getPosts()
---

<Page posts={posts} />
```

---

# 17. Theme Page Props

为了避免主题自己访问 Core，页面 Entry Layer 可以把标准数据作为 Props 传递。

例如：

```ts
export interface ArchivePageProps {
  posts: Post[]
  notes: Note[]
}
```

```ts
export interface HomePageProps {
  recentPosts: Post[]
  activeProjects: Project[]
  timeline: TimelineEvent[]
}
```

这比让 Theme Page 自己随意调 API 更容易控制依赖。

V1 可以采用：

> Pages 获取数据 → Props 注入 Theme

而组件内部不再重复请求内容。

---

# 18. 页面语义

V1 核心页面：

```text
Home
Archive
Projects
Project Detail
Timeline
Now
About
Post Detail
```

稳定路由：

```text
/
/archive
/projects
/projects/[slug]
/timeline
/now
/about
/posts/[slug]
```

---

# 19. Home 数据定义

Home 不规定布局。

Core 只提供语义数据。

例如：

```ts
export interface HomePageData {
  recentPosts: Post[]
  activeProjects: Project[]
  recentTimeline: TimelineEvent[]
}
```

Archive Theme 可以表现为：

```text
Recent Records
Active Files
Recent Events
```

Desktop Theme 可以表现为：

```text
Recent Documents
Applications
System History
```

Theme 决定"长什么样"。

---

# 20. Archive 页面

Core：

```ts
export interface ArchivePageData {
  posts: Post[]
  notes: Note[]
}
```

Theme 可以自行决定：

- 时间列表
- 卡片
- 文件管理器
- 命令行输出
- 时间轴
- 搜索界面

Core 不定义表现形式。

---

# 21. Projects 页面

Core：

```ts
export interface ProjectsPageData {
  projects: Project[]
}
```

Theme 可以显示：

Archive：

```text
PROJECT 001
PROJECT 002
```

Desktop：

```text
Folder / Application
```

RPG：

```text
Quest
```

---

# 22. 主题之间不要共享视觉组件

不要创建这种强制共享层：

```text
shared/components/Button
shared/components/Card
shared/components/Navbar
```

因为这会让主题逐渐同质化。

Theme 自己实现：

```text
archive/components/
desktop/components/
terminal/components/
```

真正适合共享的是：

```ts
formatDate()
sortByDate()
groupByYear()
getTagCount()
normalizeSlug()
```

即：

> 共享逻辑，不共享视觉。

---

# 23. Theme Interaction

每个主题可以有自己的交互系统。

例如：

## Archive

```text
themes/archive/interactions/
├─ filter.ts
└─ transition.ts
```

## Desktop

未来：

```text
themes/desktop/interactions/
├─ window-manager.ts
├─ drag.ts
├─ resize.ts
└─ shortcuts.ts
```

## Terminal

未来：

```text
themes/terminal/interactions/
├─ parser.ts
├─ history.ts
└─ keyboard.ts
```

交互实现不能进入 Core，除非它具有跨主题的纯业务意义。

---

# 24. 内容模块扩展规则

未来可能增加：

```text
books
movies
music
photos
travel
uses
bookmarks
```

新增内容类型应该采用：

```ts
getBooks()
```

而不是修改：

```ts
getPosts()
```

旧 Theme 没有使用 `getBooks()` 时：

> 必须继续正常运行。

---

# 25. 新页面扩展规则

例如未来加入：

```text
/books
```

Core 可以新增路由和数据。

旧主题有三种策略：

### Strategy A

不展示入口。

### Strategy B

使用 Generic Fallback Page。

### Strategy C

主题实现 Books Page。

V1 推荐 A。

即：

> Theme 不支持新模块时，可以完全忽略。

不要强制所有旧主题一起升级。

---

# 26. 数据字段扩展

推荐：

```ts
interface Post {
  title: string
  subtitle?: string
}
```

不要：

```text
title → heading
```

直接破坏已有主题。

如果未来必须重构核心数据：

优先：

1. 保留旧字段
2. 添加新字段
3. 标记 deprecated
4. 后续大版本再删除

V1 不实现 Runtime API Version。

---

# 27. Theme Capability

V1 可以加入简单声明：

```ts
supportsContent: {
  posts: true,
  projects: true,
  timeline: true,
  notes: true,

  books: false
}
```

这个信息主要用于：

- `/themes` 页面
- Debug
- Development Warning

暂时不要让它控制复杂运行逻辑。

---

# 28. 第一个主题：Archive

V1 正式主题：

```text
archive
```

视觉关键词：

```text
Archive
Index
Records
Catalog
Document
System
Minimal
Monospace
Editorial
```

但不要直接复制任何现有个人网站。

---

# 29. Archive Theme 页面结构

建议：

## Home

```text
Identity

Now

Recent Records

Active Projects

Recent Timeline

Archive Entrance
```

---

## Archive

支持：

```text
By Time
By Category
By Tag
```

V1 可以先实现：

```text
By Time
```

---

## Projects

项目列表 + 状态。

例如：

```text
001
ANKI CLIPBOARD IMPORT

STATUS
ACTIVE

STACK
React Native / TypeScript
```

---

## Timeline

按年月展示：

```text
2026

08
│
├─ event
├─ event
│

07
├─ event
```

---

## Now

静态内容。

---

## About

静态内容。

---

## Post

最重要：

- 标题
- 日期
- tags
- 正文
- 上一篇 / 下一篇（后续）
- TOC（后续）

V1 保持简单。

---

# 30. Test Theme

必须实现第二个极简 Theme：

```text
test-theme
```

目的不是好看。

目的：

> 验证 Theme Contract 是否真的解耦。

Test Theme 应该与 Archive 完全不同。

例如：

```text
纯黑白
超大字体
纵向导航
无 Card
无 Archive UI
```

只需实现全部核心 Page。

如果切换到 Test Theme：

- 所有页面仍能访问
- 内容不变
- URL 不变
- UI 完全不同

则 V1 架构验证成功。

---

# 31. CSS 隔离

每个 Theme 样式必须独立。

推荐：

```text
themes/archive/styles/
themes/test-theme/styles/
```

避免全局污染。

`src/styles/global.css` 如果存在，只允许：

- CSS Reset
- Accessibility 基础设置
- 极少量真正全站基础规则

不要在 global.css 放：

- 字体设计
- Theme Color
- Card
- Button
- Header
- Layout

---

# 32. Theme Assets

每个主题自己的资源：

```text
themes/archive/assets/
themes/desktop/assets/
```

例如：

- icons
- background
- cursor
- sound
- decorative image

通用内容图片仍然属于内容本身。

---

# 33. Accessibility

所有 Theme 至少保证：

- semantic HTML
- keyboard accessible
- visible focus
- prefers-reduced-motion
- reasonable contrast
- mobile usable

复杂动画主题必须：

```css
@media (prefers-reduced-motion: reduce) {
  ...
}
```

---

# 34. SEO

SEO 属于 Core。

Theme 不应自行决定：

- canonical URL
- Open Graph 基础信息
- page title composition
- description fallback

Theme 可以影响视觉，但 SEO 语义统一。

---

# 35. Site Config

建议：

```ts
export const siteConfig = {
  title: "Yibel Space",

  description: "Personal digital space",

  author: "Yibel",

  defaultTheme: "archive",

  navigation: [
    "archive",
    "projects",
    "timeline",
    "now",
    "about"
  ]
}
```

Theme 可以决定：

> 如何显示 Navigation。

但 Core 决定：

> 有哪些标准导航语义。

---

# 36. Navigation 模型

不要让 Theme 依赖硬编码 URL。

例如：

```ts
export const routes = {
  home: "/",
  archive: "/archive",
  projects: "/projects",
  timeline: "/timeline",
  now: "/now",
  about: "/about"
}
```

Theme：

```ts
routes.projects
```

而不是：

```ts
"/projects"
```

---

# 37. Import Boundary

建议设置 TS Alias：

```text
@core
@themes
@shared
@config
```

核心规则：

```text
pages      → core
pages      → themes

themes     → shared
themes     → core/types

core       → shared

core       ✗ themes
shared     ✗ themes
content    ✗ themes
```

即：

> Core 永远不能反向依赖具体 Theme。

---

# 38. 建议依赖方向

```text
             src/pages
             ↙      ↘
          core      themes
            ↓         ↓
          shared    shared
```

禁止：

```text
core → themes/archive
```

---

# 39. Cloudflare 部署

V1 默认静态构建。

要求：

```bash
npm run build
```

能够成功生成静态站。

GitHub Push 后由 Cloudflare 自动构建。

具体 Cloudflare 配置以创建项目时当前官方要求为准。

不要为了未来 SSR 提前改成复杂 Server Runtime。

---

# 40. 开发阶段

## Phase 1 — Scaffold

完成：

- Astro
- TypeScript
- Alias
- 基础目录

---

## Phase 2 — Content

实现：

- Posts
- Projects
- Timeline

Content Collections Schema。

---

## Phase 3 — Core

实现：

- Content API
- Route Config
- Site Config
- Theme Types
- Theme Registry
- Theme Resolver

---

## Phase 4 — Astro Pages

实现稳定路由。

Pages 只负责：

```text
load data
resolve theme
render theme page
```

---

## Phase 5 — Archive Theme

完整实现：

```text
Home
Archive
Projects
Project
Timeline
Now
About
Post
```

---

## Phase 6 — Test Theme

实现第二套完全不同的 UI。

---

## Phase 7 — Validation

确认：

- Theme 切换不会改变 URL
- Content 不依赖 Theme
- Theme 不直接访问 Markdown
- Theme 样式不互相污染
- Build 成功
- Mobile 可用

---

## Phase 8 — Cloudflare

部署。

---

# 41. V1 验收标准

## Content

- [ ] Markdown Post 可以正常渲染
- [ ] Project 可以正常读取
- [ ] Timeline 可以正常读取
- [ ] Draft Post 不出现在 production

## Routing

- [ ] `/`
- [ ] `/archive`
- [ ] `/projects`
- [ ] `/projects/[slug]`
- [ ] `/timeline`
- [ ] `/now`
- [ ] `/about`
- [ ] `/posts/[slug]`

全部正常。

## Theme

- [ ] `archive` 完整运行
- [ ] `test-theme` 完整运行
- [ ] 只改 `defaultTheme` 即可切换构建主题
- [ ] URL 不因 Theme 改变
- [ ] 数据不因 Theme 改变
- [ ] 页面布局明显不同

## Architecture

- [ ] Core 不依赖 Theme
- [ ] Theme 不读取 Markdown 文件
- [ ] Theme 不直接调用 Astro Content Collection
- [ ] UI 组件没有被强制跨主题共享
- [ ] Core Utilities 可以共享

## Build

- [ ] TypeScript 无错误
- [ ] Astro Build 成功
- [ ] Cloudflare 部署成功

---

# 42. 明确禁止的实现

V1 不要：

### 1. 把整个项目做成 React SPA

不要。

---

### 2. 用一个巨大 ThemeContext 控制全部 CSS

不要：

```ts
if (theme === "archive") ...
if (theme === "desktop") ...
```

到处散落。

---

### 3. 所有 Theme 共用一套 Card / Button / Layout

Theme 应该允许完全不同。

---

### 4. Theme 直接读取 Content Collection

不要。

---

### 5. Core import 具体 Theme Component

不要：

```ts
import ArchiveHome from "@/themes/archive/..."
```

出现在 Core 业务代码里。

Registry 可以负责显式注册 Theme，但 Core 的普通模块不能依赖 Theme。

---

### 6. 一开始设计复杂插件系统

不要。

---

### 7. 为未来 CMS 提前设计 Repository / Adapter 体系到非常复杂

V1 只需要简单 Content API。

---

### 8. 为动态 Theme Switching 提前引入 SSR

不要。

---

# 43. 未来扩展方向

V1 完成后，再考虑：

## V2

- Theme Preview
- `/themes`
- Browser Theme Selector
- 保存用户主题偏好
- Search
- RSS
- Sitemap
- Better SEO

## V3

- Desktop Theme
- Terminal Theme
- Theme Capability
- Generic Fallback Pages

## V4

- CMS
- Git-based Editor
- 图片管理
- 在线发布文章

## V5

如果架构成熟：

```text
yibel-space-engine
yibel-space-content
```

再考虑拆分。

目前不要拆仓库。

---

# 44. Codex 实施要求

请按照以下规则开发：

1. 优先清晰代码，不追求过度抽象。
2. 每完成一个阶段确保项目可以 build。
3. 不提前实现文档未要求的高级能力。
4. 不把 Theme 做成 CSS Skin。
5. 所有 Content 数据访问集中到 Core。
6. Astro Pages 保持薄层。
7. Theme 负责完整 Presentation。
8. Core 不包含视觉设计。
9. 第二个 Test Theme 必须用于验证解耦。
10. 如果设计实现与本文档冲突，以本文档的架构边界为准。

遇到不确定实现时优先遵循：

> Simple now, extensible later.

不要为了理论上的未来扩展显著增加 V1 复杂度。

---

# 45. 第一阶段 Codex 任务建议

第一轮只实现：

```text
1. 初始化 Astro + TypeScript 项目

2. 建立本文档目录结构

3. 创建：
   - site config
   - route config
   - theme types
   - theme registry
   - theme resolver

4. 建立 Astro Content Collections：
   - posts
   - projects
   - timeline

5. 实现 Core Content API

6. 创建 archive / test-theme 的空 Theme Definition

7. 创建所有 Astro Route Entry

8. 每个 Theme 暂时只显示简单文本

9. 确保：
   npm run build
   成功
```

第一阶段不要做视觉设计。

完成后再进入 Archive Theme UI 开发。

---

# 46. 最终核心原则

整个项目必须长期保持下面这个关系：

```text
CONTENT
   │
   ↓
CORE
   │
   ↓
STABLE SEMANTIC DATA
   │
   ├──────────────┬──────────────┐
   ↓              ↓              ↓
ARCHIVE        DESKTOP        TERMINAL
   │              │              │
   ↓              ↓              ↓
Different UI   Different UI   Different UI
Different UX   Different UX   Different UX
Different      Different      Different
World          World          World
```

核心内容只有一份。

主题可以有很多套。

删除一个主题不能影响内容。

新增内容能力不能默认破坏旧主题。

新增主题不能要求修改内容。

这就是 Yibel Space 的核心架构边界。
