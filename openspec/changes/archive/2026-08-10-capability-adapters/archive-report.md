# Archive Report: capability-adapters

## Archive decision

- Change: `capability-adapters`
- Date: 2026-08-10
- Artifact mode: `openspec`
- Technical verification: `PASS WITH WARNINGS` (`verify-report.md`)
- Acceptance QA: `NOT TESTED` (`qa-report.md`), preserved unchanged
- Product acceptance: **not claimed**; this repository is an OpenCode/SDD harness with no product or operator target

The archive gate is satisfied by the explicit non-runtime exception selected by the user (option 2). The change has no application, service, product CLI, deployed runtime, or operator target. The original QA verdict remains `NOT TESTED`; it was not converted to `PASS` or `PASS WITH WARNINGS`.

Policy evidence from `openspec/config.yaml`:

- `archive.allow_non_runtime_exception: true`
- `archive.exception_scope: [documentation, configuration]`
- `archive.warning_on_exception: true`
- archive blocks `FAIL`, unresolved `CRITICAL`, `P0`, and `P1`
- acceptance-relevant `NOT TESTED` is allowed only through the documented exception

QA records the exception explicitly, including the user's option 2 decision, QA-F-001 (`P2`, accepted exception), QA-F-002 (`P3`, accepted warning), and the absence of unresolved `CRITICAL`, `P0`, or `P1` findings. The warning and the untested product scope remain visible in the archived QA report.

## Specs synced

Delta specs were merged into the canonical `openspec/specs/` source of truth before the change was moved:

| Domain | Action | Details |
|---|---|---|
| `capability-adapters` | Created | Copied the full delta as the new main spec with 8 requirements |
| `capability-policy` | Updated | 3 modified requirements; all other requirements preserved |
| `change-impact-set` | Updated | 3 modified requirements; all other requirements preserved |
| `evidence-trust-boundary` | Updated | 2 modified and 1 added requirement; all other requirements preserved |

No large destructive removal was required. The prior archive directories and the protected repository surfaces named by the proposal were not modified.

## Archived contents

The complete active change folder was moved to:

`openspec/changes/archive/2026-08-10-capability-adapters/`

The archive preserves:

- `exploration.md`
- `proposal.md`
- `specs/` and all four domain delta specs
- `design.md`
- `tasks.md`
- `apply-progress.md`
- `verify-report.md`
- `qa-report.md`
- `state.yaml`
- this `archive-report.md`

The archived `state.yaml` is:

```yaml
change: capability-adapters
current_phase: archive
completed: [explore, propose, spec, design, tasks, apply, verify, qa, archive]
next: none
updated: 2026-08-10
```

The active `openspec/changes/capability-adapters/` directory is removed after the move. No commit was created.
