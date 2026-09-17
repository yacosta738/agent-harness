# Style System Reference

Canonical visual identity for Yuniel's image prompts.

## Core Aesthetic

**Classified ops terminal × hacker dashboard × isometric technical blueprint.**

The image should feel operational, precise, and technical. It should not feel like a generic startup
landing page, a glossy AI poster, or a colorful SaaS dashboard.

## Default Terminal Palette

| Role            |                   Value | Rule                                   |
|-----------------|------------------------:|----------------------------------------|
| Background      |    `#000000`, `#080808` | Always dark, usually pure black        |
| Primary text    |               `#FFFFFF` | Main titles, labels, data              |
| Secondary text  |    `#888888`, `#666666` | Metadata, timestamps, secondary labels |
| Borders/grid    |    `#222222`, `#333333` | Hairline panels, tables, dividers      |
| Success         |     `#44FF88` dim green | Status only, never decorative          |
| Danger          |       `#FF4444` dim red | Errors/failures only                   |
| Blueprint lines | white at 15–40% opacity | Isometric diagrams, layer outlines     |

**Default rule:** black + white + gray. Use red/green only as status semantics.

## Typography

- Monospace first: IBM Plex Mono, JetBrains Mono, Courier New.
- ALL CAPS for headers, labels, nav, tables, and status badges.
- Dense technical hierarchy: big KPI numbers, compact labels, tiny metadata.
- Avoid rounded/humanist fonts for terminal layouts.

## Geometry

- Rectangular panels with 1px borders.
- Sharp corners by default.
- Bracket corners: `┌─┐`, `└─┘`, crosshair marks, tick marks.
- Dense grid, low whitespace, operational dashboard feel.
- Optional faint scanline overlay.

## Allowed Exceptions

### RPG Character Card

Use the navy/teal personal-brand palette instead of pure black terminal monochrome:

- Background: `#0a192f`
- Cards: `#112240`, `#172a45`
- Border: `#233554`
- Accent: `#64ffda`
- Text: `#e2e8f0`, `#8892b0`

This is the only pattern that allows slight rounding, clean sans body text, pixel HUD elements, and
stronger color presence.

## Brand Consistency Check

A prompt passes only if it clearly says:

1. Dark ops/terminal/blueprint aesthetic.
2. Monospace or explicit RPG exception.
3. Restrained palette.
4. Dense panel/grid composition.
5. Negative constraints against neon, gradients, SaaS, and rounded corporate UI.
