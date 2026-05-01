---
name: imagegen
description: >
  Generate images, illustrations, infographics, or visual assets for blog posts,
  articles, social media, or technical content — always applying Yuniel's personal
  design system for visual consistency across all content. Trigger this skill
  whenever the user asks to "generate an image", "create an illustration",
  "make an infographic", "design a header", "create a visual", "make a banner",
  or any request to produce a visual asset. Also trigger when the user describes
  a topic and wants a blog post header, social card, or thumbnail — even if they
  don't explicitly say "image". Always use this skill before generating any visual
  prompt; never freelance the style from memory.
---

# Image Generation Skill

This skill ensures all generated image prompts adhere to Yuniel's personal design
system — a dark, terminal-noir visual identity used across blog posts, LinkedIn
content, YouTube thumbnails, and technical articles.

The aesthetic reference is: **operational military dashboard × hacker terminal ×
isometric technical blueprint**. Think StrikeOps mission control, not startup SaaS.

---

## Design System

### Philosophy
Monochromatic darkness with surgical precision. Everything looks like it was built
inside a classified government terminal or a cyberpunk ops center. Minimal color —
when color appears, it's intentional and restrained.

### Color Palette
| Role | Value | Usage |
|---|---|---|
| Background | `#000000` / `#080808` | Pure or near-pure black canvas — always |
| Primary text | `#FFFFFF` | All main labels, titles, data |
| Secondary text | `#888888` / `#666666` | Metadata, timestamps, subtitles |
| UI borders/lines | `#222222` / `#333333` | Grid lines, table borders, dividers |
| Danger/alert accent | dim red `#FF4444` | Only for errors, failure states |
| Success accent | dim green `#44FF88` | Only for success/completed states |
| Active/selected | Inverted block (`#FFFFFF` bg, `#000000` text) | Nav active state, selected rows |
| Wireframe/blueprint | `#FFFFFF` at 15–40% opacity | 3D isometric diagrams, layer outlines |

**Rule**: The palette is black + white. Color only enters for status indicators
(dim red/green) and must be desaturated — never vibrant or neon.

### Typography
- **Primary font**: Monospace only — IBM Plex Mono, JetBrains Mono, or Courier New
- **Uppercase dominance**: Section headers, labels, column headers — ALL CAPS with
  wide letter-spacing
- **No rounded fonts**: Zero humanist sans-serif. This is not a SaaS product.
- **Size hierarchy**: Large display numbers for KPIs → medium labels → small metadata
- **Watermark**: Small monospace text at bottom corners — name, role, site — understated

### Layout & Grid
- **Dense, information-rich**: Dashboards and tables where every pixel is utilized
- **Panel-based composition**: Content in clearly bordered rectangular panels —
  like a multi-monitor ops center
- **Corner bracket decorations**: `┌─┐` / `└─┘` style marks on panels — terminal feel
- **Hairline borders**: 1px between sections, `#1A1A1A` to `#2A2A2A`
- **Scanline overlay**: Optional very faint horizontal lines — adds CRT texture

### Visual Elements
- **Data tables**: Monospaced, full-width rows. Column headers ALL CAPS.
- **Terminal/log panels**: `>` prompt, timestamps in `YYYY-MM-DD HH:MM UTC`, status codes
- **Wireframe 3D diagrams**: Isometric layered architecture — white outlines only,
  no fill, depth via line weight
- **Progress indicators**: Radial spinner from dashes, bar charts from `█` characters
- **Badges**: `[COMPLETED]` `[ACTIVE]` `[HIGH]` — monospace, minimal color
- **Sphere / globe wireframe**: White wireframe geodesic — elegant data motif

### Decorative Patterns
- **Background text**: Faint repeated technical strings (hashes, coordinates,
  commit IDs) at 5–10% opacity
- **Corner frames**: Thin bracket marks on panel corners
- **Scan lines**: Barely visible horizontal rule texture
- **Geometric accent**: Thin diagonal lines, crosshair marks, tick marks

---

## Aspect Ratios by Use Case
| Content Type | Ratio | Resolution |
|---|---|---|
| Blog post header | 16:9 | 1920×1080 |
| LinkedIn post | 1.91:1 | 1200×628 |
| LinkedIn square | 1:1 | 1200×1200 |
| YouTube thumbnail | 16:9 | 1280×720 |
| Twitter/X card | 2:1 | 1200×600 |
| Poster / infographic | 16:10 | 1920×1200 |
| OG image (default) | 16:9 | 1200×630 |

---

## Workflow

### Step 1 — Clarify (if missing info)
Ask only what's needed:
- **Topic / concept**: what should the image communicate?
- **Use case**: blog header, LinkedIn post, YouTube thumbnail, poster?
- **Key data or sections**: specific metrics, steps, or diagrams to include?

If the user's request already answers these, skip directly to Step 2.

### Step 2 — Pick the Layout Pattern

| Pattern | When to Use |
|---|---|
| **Mission Dashboard** | Multi-metric overview, KPIs, system/agent status |
| **Ops Table** | List of items with status, priority, timestamps |
| **Process Monitor** | Single operation in progress — transfer, build, deploy |
| **Architecture Poster** | Technical architecture, layered systems, tech stack |
| **Terminal Log** | Sequential events, activity feed, comms/chat log |
| **RPG Character Card** | Personal brand, bio, skills as stats, career milestones |
| **Hybrid** | Two or more panels combined for complex topics |

### Step 3 — Build the Prompt

```
PROMPT TEMPLATE:

Create a [LAYOUT PATTERN] style technical infographic for [USE CASE] about [TOPIC].

AESTHETIC:
- Dark terminal / ops-center — pure black background (#000000 or #080808)
- Monochromatic: white text and UI on black — no color fills, no gradients
- Monospace font throughout (IBM Plex Mono) — ALL CAPS for headers and labels
- Status indicators only: dim red (#FF4444) for failures, dim green (#44FF88) for success
- Dense, data-rich layout — panel-based with hairline borders (#222222)
- Corner bracket decorations `┌─┐` on panels, scanline texture overlay
- Feels like: classified military ops dashboard × hacker terminal × technical blueprint

COMPOSITION:
- Top bar: "[TITLE IN CAPS]" + subtitle/timestamp in smaller monospace
- [PANEL A — position/size]: [content — table, diagram, log, metrics]
- [PANEL B — position/size]: [content]
- [PANEL C — if needed]: [content]
- Background: faint repeated [technical strings] at 5-10% opacity
- Bottom corners: small monospace attribution watermark

TYPOGRAPHY:
- All text: monospace, uppercase for all labels and headers
- Large display numbers for KPIs
- Small tight tracking for metadata and timestamps
- No humanist or rounded fonts

TECHNICAL: [RATIO], [RESOLUTION]. High contrast #FFFFFF on #000000.

AVOID:
- Any color beyond white/black/gray + dim status red/green
- Gradients, glows, neon, bloom effects
- Rounded corners, soft shadows
- Humanist/sans-serif fonts (Inter, SF Pro, etc.)
- Flat emoji-style icons — use wireframe or ASCII representations
- Vibrant or saturated colors
- "Startup" or "SaaS" aesthetics
```

**For Midjourney**, append:
`--ar 16:9 --style raw --no color, gradient, neon, rounded, sans-serif, icons`

### Step 4 — Deliver

Output the final prompt in a clean code block. Optionally offer a variation with
a different layout pattern if the content suits multiple approaches.

---

## RPG Character Card Layout — Full Spec

This layout is reserved for **personal brand, bio, and profile infographics**.
It gamifies identity through an RPG/videogame character sheet aesthetic with
pixel-art energy and stat bars.

### Color Palette — Yuniel Web (use for RPG Character Card ONLY)

Derived from yunielacosta.com dark mode CSS variables:

| Role | Hex | CSS var |
|---|---|---|
| Background (deep) | `#0a192f` | `--color-background` |
| Background (card) | `#112240` | `--color-background-secondary` |
| Background (surface) | `#172a45` | `--color-background-surface` |
| Background (elevated) | `#1e3951` | `--color-background-tertiary` |
| Border | `#233554` | `--color-border` |
| Border hover | `#a8b2d1` | `--color-border-hover` |
| Primary accent | `#64ffda` | `--color-brand-accent` (teal/mint) |
| Text primary | `#e2e8f0` | `--color-foreground` |
| Text muted | `#8892b0` | `--color-foreground-subtle` |

**Key rule for RPG Card**: The accent `#64ffda` (teal-mint) replaces the white
of the terminal layouts. It appears on: stat bars, highlighted values, skill
badges, level indicators, and section header icons.

### RPG Card Structural Anatomy

```
┌─────────────────────────────────────────────────────────────────┐
│  PLAYER 01  ♥♥♥  XP ████████░░  [BADGE: ROLE TITLE]            │  ← HUD bar
│─────────────────────────────────────────────────────────────────│
│  ┌─ HERO PORTRAIT (left 35%) ─┐  ┌─ STATS (right 65%) ────────┐ │
│  │  [Pixel art / stylized      │  │  NIVEL: XX  [RANK BADGE]   │ │
│  │   avatar or portrait]       │  │                             │ │
│  │                             │  │  ▸ STAT 1  ████████░░  95  │ │
│  │  [NAME — large display]     │  │  ▸ STAT 2  ███████░░░  87  │ │
│  │  [ROLE SUBTITLE]            │  │  ▸ STAT 3  ██████░░░░  80  │ │
│  │                             │  │  ▸ STAT 4  █████████░  90  │ │
│  │  Bio text (2-3 lines)       │  │                             │ │
│  │                             │  │  ┌─ SPECIAL TRAIT ────────┐ │ │
│  │  ★ MISIÓN:                  │  │  │ [Icon] Title           │ │ │
│  │  [One-liner mission stmt]   │  │  │ Trait 1 · Trait 2      │ │ │
│  └─────────────────────────────┘  └─────────────────────────────┘ │
│─────────────────────────────────────────────────────────────────│
│  [KPI 1]  [KPI 2]  [KPI 3]  [KPI 4]          ← Achievement row  │
│─────────────────────────────────────────────────────────────────│
│  ┌─ HABILIDADES ──┐  ┌─ EXPERIENCIA ──┐  ┌─ CATEGORÍAS ───────┐ │
│  │ • Skill 1      │  │ Company        │  │ ■ Industry 1        │ │
│  │   description  │  │ 2020–2024      │  │ ■ Industry 2        │ │
│  │ • Skill 2      │  │ Role title     │  │ ■ Industry 3        │ │
│  │   description  │  │ Description    │  │                     │ │
│  └────────────────┘  └────────────────┘  └─────────────────────┘ │
│─────────────────────────────────────────────────────────────────│
│  ♥ FILOSOFÍA: [Name]  │  [Tagline / motto]  │  [Logo/icon]       │  ← Footer
└─────────────────────────────────────────────────────────────────┘
```

### RPG Card Design Rules

**Typography**:
- Title/name: large pixel-style or bold display font — heavy weight
- Section headers: small caps or ALL CAPS with teal `#64ffda` left border or icon
- Body text: clean sans-serif (Inter or similar) at small size — this layout
  tolerates humanist fonts unlike the terminal layouts
- Role badge: pill with teal border `#64ffda`, dark bg `#112240`

**Stat bars**:
- Filled portion: `#64ffda` (teal) — segmented block style `████░░░`
- Empty portion: `#233554` (border color) — same segmented blocks
- Label left, number right, bar center
- Pixel/retro rendering preferred — not smooth gradients

**Panels/cards**:
- Background: `#112240` with `#233554` border
- Elevated sections: `#172a45`
- Corner radius: 4–6px max — slight rounding unlike terminal layouts
- Section icons: small pixel-art or flat icons in `#64ffda`

**KPI Achievement row**:
- Large number in `#64ffda`, descriptor below in `#8892b0`
- Icon above each KPI (pixel trophy, building, star, etc.)
- Separated by subtle dividers

**Decorative elements**:
- HUD/game UI elements: health hearts (♥), XP bar, level badge
- Pixel grid or star field as background texture at low opacity
- Corner bracket marks in `#64ffda` — very subtle
- Optional: pixel art avatar or stylized portrait as focal element

### RPG Card Prompt Template

```
Create an RPG Character Card style personal brand infographic for [USE CASE]
about [SUBJECT NAME / TOPIC].

AESTHETIC:
- Videogame character sheet × RPG profile card × pixel art HUD
- Color palette: deep navy background (#0a192f), card surfaces (#112240, #172a45),
  teal-mint accent (#64ffda), text (#e2e8f0), muted text (#8892b0), borders (#233554)
- Teal (#64ffda) on stat bars, badges, section headers, level indicators
- Semi-rounded panels (4-6px radius) — not sharp like terminal, not soft like SaaS
- Pixel-style or retro-display font for name/level; Inter or clean sans for body
- Dense layout: every zone communicates something

COMPOSITION:
- HUD top bar: "PLAYER 01 ♥♥♥ XP [bar]" + role badge pill with teal border
- Left column (35%): [avatar/portrait], large name, role subtitle, bio 2-3 lines,
  mission statement in teal-bordered box
- Right column (65%): NIVEL [XX] + [RANK], then stat bars for [SKILL 1–5]
  each with teal filled blocks and numeric score
  + special trait box: [trait name] + [3 sub-traits as icons]
- Achievement strip: [KPI 1] [KPI 2] [KPI 3] [KPI 4] — icon + large number + label
- Bottom thirds: [HABILIDADES panel] [EXPERIENCIA panel] [CATEGORIES panel]
  each with teal left-border icons and clean list content
- Footer bar: philosophy/motto + tagline + small icon/logo

TYPOGRAPHY:
- Name: large, bold, heavy — pixel or display style
- Section headers: ALL CAPS, small, teal left-accent
- Body: clean small sans-serif for descriptions
- Numbers/levels: large display in teal

TECHNICAL: [RATIO], [RESOLUTION]. Navy base (#0a192f), teal accent (#64ffda).

AVOID:
- Pure black background (use navy #0a192f)
- Monochrome terminal look (this layout uses color intentionally)
- Bright neon or oversaturated colors beyond the palette
- Overly corporate or flat SaaS design
- Too much empty whitespace — this is information-dense
```

---

## Composition Patterns by Topic

| Topic Category | Layout Pattern | Key Visual Elements |
|---|---|---|
| CI/CD, automation | Process Monitor + Terminal Log | Pipeline steps as table rows, status badges, log feed |
| APIs, integrations | Ops Table | Endpoint list, method/status/response-time columns |
| Databases, storage | Dashboard | Storage KPIs, query log panel, transfer progress |
| Security, auth | Mission Dashboard | Agent/key list, encrypted comms panel, alert log |
| AI / ML | Architecture Poster | Isometric layer diagram, model → output flow |
| Software architecture | Architecture Poster | 3D wireframe layer breakdown, data flow panel |
| Git, version control | Ops Table + Terminal Log | Commit list as table, branch activity log |
| Performance, speed | Process Monitor | Speed metric, progress bars (█ chars), ETA countdown |
| Observability | Mission Dashboard | Trace timeline, KPI panels, activity log |
| Career / personal brand | RPG Character Card | Stat bars for skills, level/rank, experience timeline, KPI achievements |
| Speaker / author bio | RPG Character Card | Avatar portrait, talk topics as stats, past events as XP log |

---

## Examples

### Example 1 — Blog Header (Semantic Release)
> User: "Generate a blog header about Semantic Release and Conventional Commits"

```
Create a Mission Dashboard style technical infographic for a blog post header
about Semantic Release and Conventional Commits automation.

AESTHETIC: Pure black (#000000) background. Monochromatic white on black.
IBM Plex Mono throughout, ALL CAPS headers. Dim green (#44FF88) for completed
states, dim red for failures. Hairline borders (#222), corner bracket marks,
faint scanline texture. Classified military ops dashboard × hacker terminal.

COMPOSITION:
- Top bar: "RELEASE PIPELINE OVERVIEW" + "LAST SYNC: 2025-06-17 20:00 UTC"
- Left panel (40%): commit log table — columns: HASH | TYPE | SCOPE | MSG | STATUS
  Rows: "a3f9c2 | feat | auth | add OAuth2 support | [ANALYZED]"
  Completed rows have dim green left border
- Center panel (30%): sequential pipeline tracker
    [01] COMMIT ANALYSIS .............. [DONE]
    [02] VERSION BUMP 1.2.4 → 1.3.0 ... [DONE]
    [03] CHANGELOG GENERATED ........... [DONE]
    [04] NPM PUBLISH .................. [ACTIVE]
    [05] GITHUB RELEASE ............... [PENDING]
- Right panel (30%): KPI metrics
    CURRENT VERSION
    v1.3.0
    COMMITS ANALYZED: 47
    BREAKING CHANGES: 0
    NEXT RELEASE TYPE: MINOR
- Background: faint "feat: fix: chore: docs:" repeated at 5% opacity
- Bottom right: small monospace watermark

TECHNICAL: 16:9, 1920×1080. High contrast. 1px borders.
AVOID: Color, gradients, neon, rounded fonts, SaaS aesthetics.
```

### Example 2 — LinkedIn Post (Bloom Filters)
> User: "LinkedIn image about Bloom Filters"

```
Create an Architecture Poster style technical infographic for a LinkedIn post
about Bloom Filters — probabilistic data structures.

AESTHETIC: Pure black background, IBM Plex Mono throughout, white wireframe
diagrams, ALL CAPS labels. Terminal / technical blueprint. Hairline borders,
corner bracket frames, faint scanline overlay.

COMPOSITION:
- Top: large monospace title "BLOOM FILTER // PROBABILISTIC DATA STRUCTURE"
- Center (main diagram): wireframe illustration
    Left: "INPUT ELEMENT" → 3 arrows labeled HASH_1(x), HASH_2(x), HASH_3(x)
    Center: BIT ARRAY grid (16 cells showing 0s and 1s, active cells as [1])
    Right: two outcome boxes:
      ┌─ RESULT: DEFINITELY NOT IN SET ─┐ (dim green border)
      └─ RESULT: PROBABLY IN SET ────────┘ (white border)
- Left sidebar: properties table
    PROPERTY         VALUE
    ────────────     ──────────
    LOOKUP TIME      O(1)
    SPACE COMPL.     O(m)
    FALSE POSITIVES  POSSIBLE
    FALSE NEGATIVES  IMPOSSIBLE
- Bottom: use case badges [CACHE LAYER] [DEDUP CHECK] [URL FILTER] [SPELL CHECK]
- Background: faint binary strings at 5% opacity

TECHNICAL: 1.91:1, 1200×628px. High contrast. Monospace only.
AVOID: Color fills, gradients, icons, sans-serif fonts.
```

### Example 3 — RPG Character Card (Personal Brand)
> User: "Crea una infografía de perfil personal estilo RPG card"

```
Create an RPG Character Card style personal brand infographic for a LinkedIn post
about Yuniel Acosta — Senior Software Engineer and technical content creator.

AESTHETIC: Videogame character sheet × RPG profile card × pixel art HUD.
Color palette: deep navy (#0a192f) background, card surfaces (#112240 / #172a45),
teal-mint accent (#64ffda), primary text (#e2e8f0), muted (#8892b0), borders (#233554).
Teal (#64ffda) drives stat bars, section icons, level badge, and highlights.
Semi-rounded panels (4-6px). Dense — every zone communicates.

COMPOSITION:
- HUD top bar: "PLAYER 01 ♥♥♥  XP ████████░░" + pill badge ">_ SENIOR SOFTWARE ENGINEER"
  with teal (#64ffda) border on navy (#112240) bg
- Left column (35%):
    Stylized pixel portrait or avatar in developer style
    Name: "YUNIEL ACOSTA" — large bold display font
    Role: "SENIOR SOFTWARE ENGINEER" in teal small caps
    Bio (2 lines): "Building distributed systems, Rust tooling, and technical
    content from Valencia, Spain."
    Mission box (teal left border): "Turning complex systems into clear knowledge."
- Right column (65%):
    NIVEL: 7  [EXPERTO] badge — teal filled
    Stat bars (█ block style, teal filled / #233554 empty):
      DISTRIBUTED SYSTEMS  ████████████░░  92
      RUST / SYSTEMS       ███████████░░░  88
      TECHNICAL CONTENT    ████████████░░  90
      BACKEND ARCH.        ██████████░░░░  85
      AI TOOLING           █████████░░░░░  80
    Special trait box (#172a45 bg):
      ⚡ HOMELAB ENGINEER
      PROXMOX · RUST CLI · CONTENT CREATOR
- Achievement strip (4 KPIs across full width):
    🏠 HOMELAB     📝 +50 POSTS    🦀 RUST TOOLS    🎬 YOUTUBE
    RUNNING        PUBLISHED       SHIPPED          ACTIVE
- Bottom thirds:
    LEFT — HABILIDADES CLAVE (teal section header):
      • Distributed Systems — Kafka, event-driven arch
      • Systems Programming — Rust, async/Tokio
      • Observability — OpenTelemetry, wide events
      • Technical Writing — Blog, LinkedIn, YouTube
    CENTER — EXPERIENCIA:
      GFT
      2022 – Present
      Senior Software Engineer
      BBVA CIB integration ecosystem
    RIGHT — STACK:
      ■ Rust  ■ Kotlin  ■ Kafka
      ■ Proxmox  ■ OpenTelemetry
      ■ Kubernetes  ■ PostgreSQL
- Footer bar: "⚡ YUNIELACOSTA.COM" | "Building in public desde Valencia" | small Rust crab icon

TYPOGRAPHY:
- Name: large bold heavy display
- Section headers: ALL CAPS, small, teal left-accent icon
- Body: clean small Inter/sans for descriptions
- KPI numbers: large display in teal (#64ffda)

TECHNICAL: 9:16 vertical (1080×1920) for mobile story / poster.
Or 4:5 (1080×1350) for LinkedIn portrait format.

AVOID: Pure black (use navy #0a192f), monochrome terminal look,
neon beyond the teal palette, excessive whitespace.
```
