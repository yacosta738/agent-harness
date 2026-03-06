# Persistence Contract (shared across all SDD skills)

## Mode Resolution

The orchestrator passes `artifact_store.mode` as `openspec`.

Default resolution (when orchestrator does not explicitly set a mode):
1. Use `openspec` for persistent storage in the filesystem

## Behavior Per Mode

| Mode       | Read from                                 | Write to   | Project files |
| ---------- | ----------------------------------------- | ---------- | ------------- |
| `openspec` | Filesystem (see `openspec-convention.md`) | Filesystem | Yes           |

## Common Rules

- If mode is `openspec`, write files ONLY to the paths defined in `openspec-convention.md`.
- ALWAYS use `openspec` mode.

## Detail Level

The orchestrator may also pass `detail_level`: `concise | standard | deep`.
This controls output verbosity but does NOT affect what gets persisted — always persist the full artifact.
