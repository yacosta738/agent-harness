# Persistence Contract (shared across all SDD skills)

## Mode Resolution

The orchestrator passes `artifact_store.mode` with one of: `openspec | none`.

Default resolution (when orchestrator does not explicitly set a mode):
1. Use `openspec` for persistent storage in the filesystem
2. Fall back to `none` for transient results only

## Behavior Per Mode

| Mode       | Read from                                 | Write to   | Project files |
| ---------- | ----------------------------------------- | ---------- | ------------- |
| `openspec` | Filesystem (see `openspec-convention.md`) | Filesystem | Yes           |
| `none`     | Orchestrator prompt context               | Nowhere    | Never         |

## Common Rules

- If mode is `none`, do NOT create or modify any project files. Return results inline only.
- If mode is `openspec`, write files ONLY to the paths defined in `openspec-convention.md`.
- NEVER force `openspec/` creation unless the orchestrator explicitly passed `openspec` mode.
- If you are unsure which mode to use, default to `openspec`.

## Detail Level

The orchestrator may also pass `detail_level`: `concise | standard | deep`.
This controls output verbosity but does NOT affect what gets persisted — always persist the full artifact.
