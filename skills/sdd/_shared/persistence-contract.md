# Persistence Contract (shared across all SDD skills)

## Mode Resolution

The orchestrator passes `artifact_store.mode` as `openspec`.

Default resolution (when orchestrator does not explicitly set a mode):

1. Use `openspec` for persistent storage in the filesystem

## Behavior Per Mode

| Mode       | Read from                                 | Write to   | Project files |
|------------|-------------------------------------------|------------|---------------|
| `openspec` | Filesystem (see `openspec-convention.md`) | Filesystem | Yes           |

## Common Rules

- If mode is `openspec`, write files ONLY to the paths defined in `openspec-convention.md`.
- ALWAYS use `openspec` mode.

## Active Change Resolution

When a phase needs a `{change-name}`, resolve it in this order:

1. If the orchestrator passes `Change name: {argument}`, use it.
2. Otherwise, inspect `openspec/changes/`, excluding `archive/`.
3. If exactly ONE active change directory exists, use that as the active change.
4. If more than one active change directory exists, STOP and report ambiguity to the orchestrator.
5. If no active change directory exists, STOP and report that there is no active change.

Do NOT guess the active change when multiple candidates exist.

## Return Envelope

All SDD phases MUST return the same structured envelope:

- `status`
- `executive_summary`
- `detailed_report` (optional)
- `artifacts`
- `next_recommended`
- `risks`

Commands and skills should use this exact envelope so orchestrators can consume results
consistently.

## State Persistence (Orchestrator)

The orchestrator persists DAG state after each phase transition to enable recovery and
`sdd-continue` resumption.

Write `openspec/changes/{change-name}/state.yaml` after each phase completes:

```yaml
change: {change-name}
current_phase: {last completed phase}
completed: [explore, propose, spec, design, tasks]
next: {next phase in DAG}
updated: {ISO date}
```

To recover state: read `openspec/changes/{change-name}/state.yaml`. If missing, fall back to
checking which artifact files exist in the change directory.

## Detail Level

The orchestrator may also pass `detail_level`: `concise | standard | deep`.
This controls output verbosity but does NOT affect what gets persisted — always persist the full
artifact.
