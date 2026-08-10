# Tasks: Capability Adapters

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 850–1,100 total; 140–240 per slice |
| 400-line budget risk | High aggregate / Low per slice |
| Chained PRs recommended | Yes |
| Suggested split | S1 registry → S2 tests → S3 lint/scope → S4 coverage → S5 runner/evidence |
| Delivery strategy | ask-on-risk (default) |
| Chain strategy | pending user choice |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

**Filesystem guard:** before/after snapshots of only each slice’s paths in `/tmp/capability-adapters/Sx/`; run `git diff --no-index --numstat before after`, sum additions+deletions, reject `>400` or binary. Never use `HEAD`. Every slice records fixture RED failure and GREEN rerun in smoke evidence.

**Slice paths:** S1 `scripts/fixtures/capability-adapters/registry/`, `scripts/sdd-runner-lib/{metrics,config,toolchain}.mjs`, `openspec/quality-runner.schema.json`, smoke; S2 `scripts/fixtures/capability-adapters/tests/`, `metrics.mjs`, smoke; S3 `scripts/fixtures/capability-adapters/lint/`, `{metrics,git-impact}.mjs`, smoke; S4 `scripts/fixtures/capability-adapters/coverage/`, `{metrics,toolchain}.mjs`, smoke, lock only if verified; S5 `scripts/fixtures/capability-adapters/integration/`, `scripts/sdd-quality-runner.mjs`, `scripts/sdd-runner-lib/{result,evidence-boundary,git-impact}.mjs`, smoke, `state.yaml`.

## Phase 1: Registry / Contract
- [x] **1.1 RED** — Files: registry fixtures + `scripts/sdd-capability-adapters-smoke.sh`; D=none; V=`bash ... registry` fails; Done=duplicate/missing/latest/range/no-digest cases; RB=remove fixtures.
- [x] **1.2 GREEN** — Files: `metrics.mjs`, `config.mjs`, `toolchain.mjs`; D=1.1; V=`node --check` + smoke; Done=exact locked pins, no network/download; RB=revert S1 code.
- [x] **1.3 REFACTOR** — Files: `openspec/quality-runner.schema.json`, smoke; D=1.2; V=JSON parse + guard; Done=legacy accepted and flags off; RB=revert schema.

## Phase 2: Test Adapter
- [x] **2.1 RED** — Files: test fixtures + smoke; D=S1; V=`bash ... tests` fails; Done=pass/fail/timeout/process/absent cases; RB=remove fixtures.
- [x] **2.2 GREEN** — Files: `scripts/sdd-runner-lib/metrics.mjs`; D=2.1; V=`node --check` + smoke; Done=Node/pytest normalization and distinct statuses; RB=revert S2 code.
- [x] **2.3 REFACTOR** — Files: `metrics.mjs`, test fixtures; D=2.2; V=guard + smoke; Done=raw/normalized fields and no inference; RB=revert S2.

## Phase 3: Lint / Scope
- [x] **3.1 RED** — Files: lint/scope fixtures + smoke; D=S2; V=`bash ... lint` failed before implementation with `TypeError: normalizeDeclaredLintResult is not a function`; Done=errors/warnings/malformed/traversal/project/changed-files; RB=remove fixtures.
- [x] **3.2 GREEN** — Files: `metrics.mjs`, `git-impact.mjs`; D=3.1; V=scope smoke; Done=ESLint JSON normalization, policy thresholds, POSIX paths, exact changed-files coverage, provider absence, and no project substitution; RB=revert S3 code.
- [x] **3.3 REFACTOR** — Files: `git-impact.mjs`, smoke; D=3.2; V=guard + `node --check`; Done=unsupported scope and path/symlink escapes are non-pass; explicit S3 snapshot delta 16 changed lines, no binaries, no `git diff HEAD`. RB=revert S3.

## Phase 4: Coverage / Availability
- [x] **4.1 RED** — Files: coverage fixtures + smoke; D=S3; V=`bash ... coverage` fails; Done=full/partial/global-only/missing-provider; RB=remove fixtures.
- [x] **4.2 GREEN** — Files: `metrics.mjs`, `toolchain.mjs`; D=4.1; V=coverage smoke; Done=available metrics normalize and global never passes changed-files; RB=revert S4 code.
- [x] **4.3 REFACTOR** — Files: `openspec/quality-toolchain.lock` only if verified; D=4.2; V=lock parse + guard; Done=absent Python coverage is `UNAVAILABLE`; RB=revert lock entry.

## Phase 5: Runner / Evidence
- [x] **5.1 RED** — Files: integration fixtures + smoke; D=S4; V=integration smoke fails; Done=dispatch/legacy/redaction/traversal/limit/hash cases; RB=remove fixtures.
- [x] **5.2 GREEN** — Files: `sdd-quality-runner.mjs`, `result.mjs`, `evidence-boundary.mjs`; D=5.1; V=full smoke; Done=adapter fields, hashes, artifacts, statuses persist safely; RB=revert S5 code.
- [x] **5.3 REFACTOR** — Files: S5 files + `state.yaml`; D=5.2; V=all smokes + guard; Done=v1/v2 compatibility, state/evidence handoff, flags off, state next=`apply`; RB=remove S5 additions, preserve legacy evidence.

**Excluded:** `opencode.json`, dotfiles, plugins, `prompts/`, `skills/`, `.codegraph/`, archived control-plane change, `openspec/quality-runner.json`; CRAP, mutation, DRY, acceptance, architecture, permissions, distribution.
