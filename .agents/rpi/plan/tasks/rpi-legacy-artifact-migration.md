# RPI legacy artifact migration

## Goal

Make projects adopting the updated harness retain their existing RPI task documents under
`.agents/rpi/plan/tasks/`.

## Acceptance criteria

- [x] Detect and migrate legacy `plan/tasks/` before creating a new RPI task document.
- [x] Preserve all existing task files and avoid overwriting when both paths exist.
- [x] Document the upgrade behavior in the RPI skill, orchestrator, and README.
- [x] Review the diff and run `git diff --check`.

## Evidence

- `git diff --check` passed.
- Manual diff review confirmed that migration is documented at the RPI decision point and that
  conflicts halt before creating new task files.
