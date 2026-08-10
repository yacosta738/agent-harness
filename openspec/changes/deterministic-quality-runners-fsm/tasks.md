# Tasks: Deterministic Quality Runners and SDD FSM

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 850–1,100 total; 170–290 per slice |
| 400-line budget risk | High aggregate / Low per slice |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 contract → PR 2 runner → PR 3 FSM → PR 4 adapters/docs |
| Delivery strategy | ask-on-risk |
| Chain strategy | sequential local slices; PR split deferred |

Decision needed before apply: No — apply sequential local slices; publish as stacked PRs only if requested
Chained PRs recommended: Yes
Chain strategy: sequential local slices; PR split deferred
400-line budget risk: High

Before each apply/handoff, set `BASE` to the approved immediate parent and run this exact guard on that slice’s paths; a non-zero exit blocks the slice:

```sh
BASE=<immediate-parent>; git diff --numstat "$BASE" -- <slice-paths> | node -e 'const fs=require("node:fs"),s=fs.readFileSync(0,"utf8").trim();const n=(s?s.split(/\r?\n/):[]).reduce((t,l)=>{const [a,d]=l.split(/\s+/);return t+Number(a)+Number(d)},0);console.log(`changed=${n}`);if(n>400){console.error("BLOCKED: slice exceeds 400 changed lines");process.exit(1)}'
```

Every slice starts with a failing fixture/contract smoke check, then minimum implementation and RED→GREEN rerun. With no root test runner, record fixture evidence only; do not claim full TDD.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Contract/config + fixtures | PR 1 | Independent; schema, manifest validation, two stacks |
| 2 | Runner execution/envelopes | PR 2 | Depends on 1; argv/shell, env, redaction, timeout |
| 3 | FSM/state safety | PR 3 | Depends on 1; gates, legacy state, lock/atomicity |
| 4 | Adapters/docs/distribution | PR 4 | Depends on 2–3; verify/QA evidence and rollout smoke |

If stacked PRs are selected: `trunk=main`, `parent_branch/base` is the immediate lower layer, `branch` is unique per unit, `position=1..4`, and issue/Linear metadata is assigned before apply.

## Phase 1: Infrastructure

- [x] 1.1 RED: add `scripts/fixtures/` manifests and failing `scripts/sdd-smoke.sh` contract checks for explicit argv, missing capability, and two unrelated stacks.
- [x] 1.2 Create `openspec/quality-runner.schema.json` (`quality-runner/v1`) and extend `openspec/config.yaml` with opt-in quality/workflow policy; validate `openspec/quality-runner.json` precedence and no stack inference in `scripts/sdd-runner-lib/config.mjs`.
- [x] 1.3 GREEN/done: run `node --check` on new modules and `bash scripts/sdd-smoke.sh` against fixtures; absent configuration is `UNAVAILABLE`/`NOT TESTED`, never `PASS`.

## Phase 2: Implementation

- [x] 2.1 RED: extend fixtures for argv vs explicit shell, allowlisted env, secret redaction, timeout, parser/exit failures, and artifact paths.
- [x] 2.2 Implement `scripts/sdd-runner-lib/{exec,redact,result}.mjs` and `scripts/sdd-quality-runner.mjs`: process groups, caps, statuses, parser/threshold policy, versioned envelope, and human evidence.
- [x] 2.3 GREEN/done: prove command/cwd/exit/duration/reason/artifact identity and `PASS|FAIL|BLOCKED|UNAVAILABLE|NOT_TESTED` mappings with no persisted secret.

## Phase 3: Testing / Verification

- [x] 3.1 RED: add FSM fixtures for legal/illegal phases, parallel spec+design, archive gates, legacy four-field state, idempotency, stale lock, concurrent writers, and failed writes.
- [x] 3.2 Implement `scripts/sdd-runner-lib/{state,atomic}.mjs` and `scripts/sdd-fsm.mjs`: compatible YAML, revision/hash+idempotency, `${change}/.fsm.lock`, fsync+rename, gates, and machine rejections.
- [x] 3.3 Update `commands/sdd-continue.md` to consume FSM outcomes while retaining visible prompt fallback; do not rewrite this change’s current `state.yaml` except phase bookkeeping.
- [x] 3.4 GREEN/done: run `bash scripts/sdd-smoke.sh`, `node --check scripts/*.mjs`, and inspect that rejected/stale transitions preserve prior state.

## Phase 4: Docs / Distribution

- [x] 4.1 RED: create report fixtures proving verify/QA preserve runner status, reason, evidence, `UNAVAILABLE→NOT TESTED`, external constraint→`BLOCKED`, and visible `fallback`.
- [x] 4.2 Adapt `prompts/sdd/sdd-verify.md`, `prompts/sdd/sdd-qa.md`, `skills/sdd/sdd-{verify,qa}/SKILL.md`, and `skills/sdd/_shared/openspec-convention.md`; document `README.md` and `.agents/skill-registry.md` contracts and rollback.
- [ ] 4.3 Source smoke passes; distribution smoke is blocked until the dotfiles submodule pointer and Dotter materialization are rolled out. Verify relative references and no source absolute paths; do not modify dotfiles here.

Optional/deferred: plugin runtime wiring (`plugins/background-agents.ts`, `opencode.json`) and stack autodetection. Keep both disabled; missing runner/FSM uses explicit prompt fallback and never claims deterministic `PASS`.
