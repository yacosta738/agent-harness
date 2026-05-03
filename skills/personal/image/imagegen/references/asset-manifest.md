# Asset Manifest

This skill currently uses textual references only. The `assets/` folders are prepared for future visual inputs.

## Directory Layout

```text
assets/
  palettes/   # palette screenshots, swatches, CSS exports
  examples/   # generated images or approved visual references
  logos/      # personal logo, site marks, channel branding
  textures/   # scanlines, grid overlays, terminal textures
```

## How Future Agents Should Use Assets

1. Check whether relevant assets exist before generating a visual prompt.
2. If assets exist, mention them as visual references in the generated prompt.
3. Do not invent that an asset exists. If the folder is empty, rely on textual references.
4. Preserve the canonical style system unless the user explicitly asks for a different campaign style.

## Naming Convention

Use descriptive lowercase names:

```text
examples/blog-header-semantic-release-2025.png
examples/linkedin-bloom-filter-terminal.png
palettes/yuniel-dark-mode.css
logos/yuniel-mark-white.svg
textures/scanline-overlay.png
```

## Asset Quality Criteria

Approved example assets should demonstrate at least three of these:

- Dark terminal/noir aesthetic.
- Monospace typography.
- Dense grid or panel composition.
- Restrained palette.
- Wireframe/isometric technical diagram.
- Clear negative space control without looking empty.
- Avoidance of neon, gradients, and SaaS styling.
