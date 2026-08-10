# Apply Progress: capability-adapters

Status: partial — Phase 4 / Slice 4 complete; Slice 5 remains.

## Delivery
- Mode: openspec
- Strategy: local-sequential-no-commits; same worktree; no branches or PRs
- Slice: Phase 2 / Slice 2 — declared test adapters and deterministic result normalization
- Review guard: explicit S1 path snapshot under `/tmp/capability-adapters/S1/`; 269 changed lines at the implementation guard; subsequent progress-only metadata remains within the 400-line limit. No `git diff HEAD` baseline used.
- S2 guard: explicit before/after snapshots under `/tmp/capability-adapters/S2/`; implementation delta was 39 additions in `metrics.mjs`, smoke delta 49 additions/3 deletions, 40 fixture additions, plus 3 task additions/3 deletions and 20 progress additions/7 deletions (164 changed lines by explicit snapshot accounting), below 400. No binary files and no `git diff HEAD` baseline used.
- S4 guard: explicit before/after snapshots under `/tmp/capability-adapters/S4/`; implementation delta was 98 additions / 0 deletions in `metrics.mjs`, 87 additions / 1 deletion in the smoke, plus 6 new coverage fixtures (76 fixture lines), giving 261 additions / 1 deletion (≈262 changed lines by `git diff --no-index --numstat` accounting) — well below the 400-line budget. Lock file `openspec/quality-toolchain.lock` was not modified because the design instructs not to change it now. No `git diff HEAD` and no binary files.
- TDD limitation: repository has no executable root test runner and `strict_tdd` is disabled. Fixture-first RED/GREEN evidence is recorded; full RED→GREEN→REFACTOR compliance is not claimed.

## Completed Tasks
- [x] 1.1 RED — Added registry fixtures and `scripts/sdd-capability-adapters-smoke.sh`; RED observed before implementation with `TypeError: validateCapabilityRegistry is not a function`.
- [x] 1.2
- [x] 1.3
- [x] 2.1
- [x] 2.2
- [x] 2.3
- [x] 3.1
- [x] 3.2
- [x] 3.3
- [x] 4.1 RED
- [x] 4.2 GREEN
- [x] 4.3 REFACTOR
- [x] 5.1 RED
- [x] 5.2 GREEN
- [x] 5.3 REFACTOR

## Slice 5 — Runner / Evidence Integration

- Fixture-first integration evidence is present under `scripts/fixtures/capability-adapters/integration/` for dispatch, legacy v1/v2 envelopes, redaction, traversal, and artifact hashes.
- `bash scripts/sdd-capability-adapters-smoke.sh integration` — PASS: integration dispatch, v1/v2 envelopes, redaction, traversal, and artifact hashes.
- `bash scripts/sdd-capability-adapters-smoke.sh` — PASS: registry/metrics, test adapter, coverage/availability, and integration modes.
- `bash scripts/sdd-control-plane-smoke.sh` — PASS.
- `bash scripts/sdd-quality-smoke.sh` — PASS.
- `bash scripts/sdd-fsm-smoke.sh` — PASS.
- `bash scripts/sdd-smoke.sh` — PASS.
- `node --check scripts/sdd-runner-lib/*.mjs scripts/sdd-quality-runner.mjs` — PASS.
- `bash -n scripts/*.sh` — PASS.
- `fixture-first evidence present; RED historical not independently reproducible in this reconciliation`.
- `guard evidence unavailable in this reconciliation; no git diff HEAD baseline used`.
- `opencode.json` and the prior `deterministic-quality-runners-fsm` change were not modified by this reconciliation.
