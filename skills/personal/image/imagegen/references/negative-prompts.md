# Negative Prompts Reference

Apply these constraints to every generated visual prompt unless a user explicitly overrides them.

## Default Avoid List

- Neon cyberpunk glow.
- Bright saturated colors.
- Gradients and bloom effects.
- Soft shadows and glassmorphism.
- Rounded SaaS cards.
- Startup landing-page aesthetic.
- Corporate stock illustrations.
- Friendly cartoon/vector mascots.
- Emoji-style icons.
- Humanist sans-serif typography for terminal layouts.
- Random abstract AI brains, glowing humanoid robots, generic circuit backgrounds.
- Decorative color without semantic status meaning.

## Terminal Layout Negative Prompt

Use wording like:

```text
AVOID: neon colors, gradients, glow, bloom, glassmorphism, rounded SaaS cards,
corporate startup UI, humanist sans-serif fonts, emoji icons, cartoon style,
colorful abstract AI art, soft shadows, excessive whitespace.
```

## RPG Character Card Negative Prompt

RPG allows navy/teal color, slight rounding, and pixel HUD elements, but still avoid:

```text
AVOID: pure black terminal monochrome, corporate SaaS dashboards, glossy 3D avatars,
oversaturated neon, fantasy medieval UI, anime style unless explicitly requested,
large empty whitespace.
```

## Common Failure Corrections

| If the draft says...         | Replace with...                                |
|------------------------------|------------------------------------------------|
| futuristic neon AI dashboard | classified monochrome ops terminal             |
| colorful gradient background | pure black background with faint scanlines     |
| modern SaaS cards            | sharp rectangular command panels               |
| friendly icons               | wireframe symbols, ASCII badges, status labels |
| elegant sans-serif           | monospace technical typography                 |
| vibrant accent colors        | dim semantic red/green status indicators only  |
