# Components, presets, and personas

`harness.config.json` selects a preset, persona, TDD mode, and component overrides. `scripts/harness-config.mjs`
renders the deterministic effective tree under `dist/opencode/`.

## Components

`core`, `skills`, `permissions`, `persona`, `delegation`, `engram`, `context7`, `sdd`, `rdd`,
`judgment-day`, `theme`, and `integrations` are selectable. Core always includes ODD and remote-operation
authorization boundaries.

## Presets

- `minimal`: core, skills, permissions, persona.
- `recommended`: minimal plus delegation, Engram, Context7, SDD, RDD, and Judgment Day.
- `full`: recommended plus theme and current integrations.

## Personas

- `kerrigan`: existing Cuban-style architect/mentor.
- `neutral`: same accountability without regional language.
- `custom`: preserve user-managed persona instructions.
