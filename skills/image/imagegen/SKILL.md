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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- |
| **Mission Dashboard** | Multi-metric overview, KPIs, system/agent status |
| **Ops Table** | List of items with status, priority, timestamps |
| **Process Monitor** | Single operation in progress — transfer, build, deploy |
| **Architecture Poster** | Technical architecture, layered systems, tech stack |
| **Terminal Log** | Sequential events, activity feed, comms/chat log |
| **Hybrid** | Two or more panels combined for complex topics |

### Step 3 — Build the Prompt

```text
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

## Composition Patterns by Topic

| Topic Category | Layout Pattern | Key Visual Elements |
| --- | --- | --- |
| CI/CD, automation | Process Monitor + Terminal Log | Pipeline steps as table rows, status badges, log feed |
| APIs, integrations | Ops Table | Endpoint list, method/status/response-time columns |
| Databases, storage | Dashboard | Storage KPIs, query log panel, transfer progress |
| Security, auth | Mission Dashboard | Agent/key list, encrypted comms panel, alert log |
| AI / ML | Architecture Poster | Isometric layer diagram, model → output flow |
| Software architecture | Architecture Poster | 3D wireframe layer breakdown, data flow panel |
| Git, version control | Ops Table + Terminal Log | Commit list as table, branch activity log |
| Performance, speed | Process Monitor | Speed metric, progress bars (█ chars), ETA countdown |
| Observability | Mission Dashboard | Trace timeline, KPI panels, activity log |
| Career / personal brand | Architecture Poster | Skills as layers, principles as pillars |

---

## Examples

### Example 1 — Blog Header (Semantic Release)
>
> User: "Generate a blog header about Semantic Release and Conventional Commits"

```text
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
>
> User: "LinkedIn image about Bloom Filters"

```text
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
