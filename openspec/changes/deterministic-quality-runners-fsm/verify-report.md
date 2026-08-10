# Verification Report: deterministic-quality-runners-fsm

## Identity and scope

- **Change**: `deterministic-quality-runners-fsm`
- **Mode**: `openspec`
- **Phase**: technical verification re-run after remediation V-01..V-04
- **Date**: 2026-08-09
- **Authority read**: `exploration.md`, `proposal.md`, all three delta specs, `design.md`, `tasks.md`,
  `apply-progress.md`, `openspec/config.yaml`, the runner/FSM sources, fixtures, and the smoke scripts.
- **Boundary**: this report verifies technical conformance only. It does not claim product/operator
  acceptance; the next independent handoff is `sdd-qa`, which owns acceptance scenarios and `qa-report.md`.
- **Change safety**: no production source, dotfiles, `.codegraph/`, commits, branches, or PRs were
  modified during this verification phase. Only this report and phase bookkeeping are persisted.

The repository policy has `strict_tdd: false` and no root test runner. The root runner/FSM policy is
intentionally disabled, so direct execution against this checkout produces explicit `NOT_TESTED`/
`fallback` outcomes. Enabled Node and Python fixture projects provide the runtime evidence below.
Full RED→GREEN→REFACTOR/TDD compliance is **not claimed**.

## Completeness

| Metric | Value |
|---|---:|
| Enumerated task items | 13 |
| Completed task items | 12 |
| Incomplete task items | 1 |
| Incomplete item | `4.3` — distribution smoke/rollout |

Tasks `1.1–4.2` are marked complete in `tasks.md` and `apply-progress.md`. Task `4.3` remains
incomplete because the dotfiles submodule pointer and effective Dotter materialization were not rolled
out; `apply-progress.md` records this as an external limitation. It is a WARNING, not a core source
implementation failure.

## Build, syntax, and runtime evidence

All requested commands were executed in `/Users/acosta/Dev/agent-harness` after V-01..V-04:

| Command | Result | Runtime evidence |
|---|---|---|
| `bash scripts/sdd-quality-smoke.sh` | **PASS** | argv/shell, artifact references, environment isolation, value/key/pattern redaction, unavailable, timeout, parser, threshold, and skip checks passed. |
| `bash scripts/sdd-fsm-smoke.sh` | **PASS** | parallel spec/design completion, idempotency, stale revision, concurrent writers, stale lock, and atomic transition checks passed. |
| `bash scripts/sdd-smoke.sh` | **PASS** | explicit manifests, unrelated Node/Python configuration, missing capability, project-safe paths, redaction, timeout/parser/exit status, and report fallback fixtures passed. |
| `node --check scripts/sdd-quality-runner.mjs scripts/sdd-fsm.mjs scripts/sdd-runner-lib/*.mjs` | **PASS** | exit code `0`; all requested ES modules parsed. |
| `bash -n scripts/*.sh` | **PASS** | exit code `0`; all shell scripts parsed. |

Additional focused runtime checks:

| Check | Result | Evidence |
|---|---|---|
| Node fixture runner | **PASS** | `test`: `PASS`, reason `policy_satisfied`, exit `0`, configured capability identity retained. |
| Python fixture runner | **PASS** | `test`: `PASS`, reason `policy_satisfied`, exit `0`; no stack-specific branch used. |
| Repeatable interpretation | **PASS** | Two identical threshold runs both returned `FAIL` / `threshold_rejected`, with accepted parser and rejected threshold. |
| Unsafe capability ID | **PASS** | `../../../../escape` produced a hashed evidence stem under `artifacts/runs/{run-id}`; no traversal occurred. |
| Evidence collision resistance | **PASS** | `a/b` and `a-b` generated distinct evidence stems; owner/path assertions passed. |
| JSON redaction | **PASS** | Configured key, value, and regex-pattern matches were absent from persisted JSON and Markdown evidence. |
| Archive minimum/report gate | **PASS** | Incomplete report rejected; complete `PASS`/`PASS WITH WARNINGS` reports accepted when no blocker exists. |
| Archive finding gate | **PASS** | `CRITICAL`/`P0`/`P1` table and bullet findings with open, unknown, or ambiguous status rejected; `resolved`/`closed` finding accepted. |
| Configuration/documentation exception | **PASS** | Explicit policy `allow_non_runtime_exception: true`, `NOT TESTED`, scope rationale, warning/fallback accepted without changing verdict. |

### Disabled-mode evidence

- `node scripts/sdd-quality-runner.mjs run --project . --json` returned exit `0` with
  `result.status: NOT_TESTED` and `reason: runner_disabled`.
- `node scripts/sdd-fsm.mjs inspect --project . --change deterministic-quality-runners-fsm` returned
  exit `3` with `status: fallback` and `reason: fsm_disabled`.
- These are explicit compatibility outcomes, not deterministic enforcement and not passes.

### Not configured / not run

- No root `test_command`, build command, type-check command, coverage threshold, linter, or mutation
  runner is configured. There is no root `package.json`, `Makefile`, or equivalent test manifest.
- No broad build was run; the requested syntax/smoke checks are the relevant executable validation for
  this configuration/utility repository.
- Coverage is **not configured** and therefore was not run.
- Distribution smoke from the dotfiles submodule/effective `~/.config/opencode` remains blocked by
  stale consumer copies, as recorded by task `4.3`; no dotfiles files were changed.

## Spec compliance matrix

`PASS` below means a covering executable check passed at runtime. Structural source inspection alone
was not promoted to a passing scenario. The smoke scripts are the repository's explicit fixture test
harness because the project has no general root test runner.

### `quality-runners`

| Requirement | Scenario | Covering runtime evidence | Result |
|---|---|---|---|
| Declarative project capabilities | Unrelated configured stacks | `sdd-quality-smoke.sh` + Node and Python fixture invocations | **PASS** |
| Declarative project capabilities | Tool is not configured | `sdd-smoke.sh` missing manifest/capability checks; `UNAVAILABLE` result | **PASS** |
| Safe execution/classification | Shell opt-in and environment isolation | `sdd-quality-smoke.sh` shell fixture and non-allowlisted `FIXTURE_SECRET` | **PASS** |
| Safe execution/classification | Missing command, timeout, or invalid parser | `sdd-quality-smoke.sh`: `UNAVAILABLE`, `BLOCKED`, `FAIL` | **PASS** |
| Auditable result envelope | Evidence and sensitive output | `sdd-quality-smoke.sh` + focused key/value/pattern redaction check | **PASS** |
| Auditable result envelope | Repeatable interpretation | Focused repeated normalized threshold invocation | **PASS** |
| Preserve artifacts/evidence | Failed capability remains inspectable | `sdd-smoke.sh`/quality smoke retained JSON and Markdown references for failures | **PASS** |

### `sdd-workflow-fsm`

| Requirement | Scenario | Covering runtime evidence | Result |
|---|---|---|---|
| Enforce state graph | Parallel specification and design | `sdd-fsm-smoke.sh` | **PASS** |
| Enforce state graph | Illegal transition | `sdd-fsm-smoke.sh` archive-before-gate path | **PASS** |
| Enforce gates | Archive without valid QA | `archive-minimum` rejected incomplete report; `archive-findings` rejected blocker | **PASS** |
| Enforce gates | Valid gate sequence | `archive-resolved` and complete report fixture accepted | **PASS** |
| Legacy/idempotent state | Legacy resume | `sdd-smoke.sh` and `sdd-fsm-smoke.sh` legacy four-field state | **PASS** |
| Legacy/idempotent state | Repeated transition | `sdd-fsm-smoke.sh` second identical request returned `idempotent: true` | **PASS** |
| Atomic/conflict-safe persistence | Concurrent phase requests | `sdd-fsm-smoke.sh` accepted one writer and rejected the other | **PASS** |
| Atomic/conflict-safe persistence | State write failure | Focused smoke path preserves prior state on atomic write failure | **PASS** |

### `acceptance-qa`

| Requirement | Scenario | Covering runtime evidence | Result |
|---|---|---|---|
| Consume runner evidence without changing authority | Runner failure | `sdd-smoke.sh` + `verify-runner-fail.md`; `FAIL`, reason, and evidence reference retained | **PASS** |
| Consume runner evidence without changing authority | Missing or unavailable capability | `sdd-smoke.sh` + `qa-fallback.md`; unavailable scope represented as `NOT TESTED` | **PASS** |
| Consume runner evidence without changing authority | Prompt-driven fallback | Disabled runner/FSM commands plus fallback fixture | **PASS** |
| Controlled results/evidence | No fabricated pass for external constraint | Quality timeout produced `BLOCKED`; report vocabulary/fixture preserves non-pass mapping | **PASS** |
| Complete QA report | Auditable completion | Report fixture contract and FSM archive completeness gate exercised | **PASS** |

### Original acceptance-qa scenarios

The active delta contains the five runner/FSM integration scenarios above. The original acceptance-qa
specification is also read and checked for regression at the contract layer:

| Original scenario | Runtime evidence | Result |
|---|---|---|
| Independent handoff | `sdd-smoke.sh` report fixtures and explicit verify→QA ownership in artifacts | **PASS** |
| Normal routing | FSM legal `verify→qa`; archive requires `qa-report.md` | **PASS** |
| Capability selection | Node/Python configured fixture capabilities identify target/capability | **PASS** |
| No executable capability | Disabled/missing runner returns `NOT_TESTED`/`UNAVAILABLE`, never `PASS` | **PASS** |
| Risk and environment coverage | Environment allowlist, timeout, redaction, and state smoke checks | **PASS** |
| No fabricated pass | Timeout `BLOCKED`; unavailable `NOT TESTED`; fallback visible | **PASS** |
| Auditable completion | Complete-report structure gate accepts only required sections | **PASS** |
| Archive decision | Incomplete, blocking, ambiguous, resolved, and explicit-exception cases exercised | **PASS** |
| Resume in flight | FSM preserves evidence/state and does not permit archive before its gate | **PASS** |

**Scenario summary**: 29/29 listed original and remediation scenarios have passing executable
coverage in the fixture/smoke harness. This is technical contract evidence, not product acceptance.

## Correctness assessment

| Area | Status | Notes |
|---|---|---|
| Declarative capabilities and no stack inference | **Implemented** | Explicit `quality-runner/v1` manifests load unrelated Node/Python commands; absent configuration is non-pass. |
| argv/shell, env allowlist, timeout, output caps, status mapping | **Implemented** | Focused runtime checks passed; POSIX process groups are terminated on timeout. |
| Evidence path safety and ID collision handling | **Implemented** | Unsafe IDs are hashed; evidence filenames are contained within the run directory and owner-checked. Distinct IDs cannot silently reuse a stem. |
| Recursive redaction | **Implemented** | Values and regex matches are redacted in strings; JSON object keys are transformed deterministically with hash/suffix collision handling; persisted JSON/Markdown checks passed. |
| Versioned envelopes and artifacts | **Implemented** | Every attempted capability writes machine-readable and human evidence, including unavailable, blocked, and not-tested outcomes. |
| FSM graph and legacy state | **Implemented** | Legal graph, parallel spec/design, legacy fields, revision/hash/idempotency, and fallback paths exercised. |
| Archive/report gates | **Implemented** | Required report sections/verdicts are enforced; CRITICAL/P0/P1 in tables and bullets block unless explicitly resolved/closed/ignored; ambiguous states block. |
| Configuration/documentation exception | **Implemented** | Only explicit policy plus `NOT TESTED`, scope, and visible rationale/warning permits the exception. |
| Atomic writes and conflicts | **Implemented with limited stress scope** | Lock, stale-lock, fsync/rename, and basic concurrency paths passed; exhaustive crash/stress testing was not available. |
| Verify/QA adapters | **Implemented at contract level** | Prompt/skill/fixture adapters preserve runner status and fallback vocabulary; acceptance remains owned by `sdd-qa`. |

## Design coherence

| Design decision | Followed? | Evidence / deviation |
|---|---|---|
| Built-in Node.js standalone runner/FSM, no plugin hooks | **Yes** | Implementation remains under `scripts/`; no `opencode.json` plugin wiring was added. |
| `openspec/quality-runner.json`, `quality-runner/v1`, explicit config precedence | **Yes** | Schema, manifests, loader, and fixture checks agree. |
| argv by default; shell requires `{enabled: true, reason}` | **Yes** | Schema, loader, and shell fixture pass. |
| Runner/FSM are authority; prompts are adapters | **Yes** | Machine outcomes drive smoke gates; disabled mode is visibly fallback and non-pass. |
| Preserve legacy state and add metadata | **Yes** | Legacy fields and unknown scalar preservation remain exercised; revision metadata is additive. |
| Atomic lock/write persistence | **Yes for exercised paths** | `mkdir` lock, stale handling, fsync, rename, and conflict behavior pass. |
| Visible fallback and additive rollout | **Yes** | Disabled root policy returns explicit `NOT_TESTED`/`fallback`; no consumer files changed. |
| Three-environment distribution rollout | **Not complete** | Source checkout passed; dotfiles submodule/effective config remain stale, so distribution smoke is external-blocked. |

## Task completion and TDD audit

| Task group | Status | Evidence |
|---|---|---|
| 1.1–1.3 contract/config/fixtures | **Complete** | Requested smoke and syntax checks passed. |
| 2.1–2.3 runner execution/envelopes | **Complete** | Quality smoke plus focused unsafe-ID/redaction/repeatability checks passed. |
| 3.1–3.4 FSM/state/fallback | **Complete** | FSM smoke plus archive gate/exception checks passed. |
| 4.1–4.2 adapters/docs/fixtures | **Complete at contract level** | Report fixtures and adapter vocabulary checks passed. |
| 4.3 source/distribution smoke | **Incomplete** | Source smoke passed; consumer pointer/Dotter materialization is stale and outside this repository. |

| TDD metric | Status |
|---|---|
| Strict TDD mode | **Inactive** (`strict_tdd: false`) |
| Root test runner | **Not available** |
| RED→GREEN→REFACTOR per task | **Cannot verify; not claimed** |
| Tests committed before or with code | **Cannot verify from uncommitted worktree; not claimed** |
| Fixture-first remediation checks | **Observed** in `apply-progress.md`; focused RED/GREEN evidence is not equivalent to full TDD. |

## Findings

### CRITICAL

None. V-01 through V-04 are remediated and covered by passing runtime checks. No unresolved
CRITICAL/P0/P1 finding remains.

### WARNING

| Finding | Judge A | Judge B | Severity | Status |
|---|---|---|---|---|
| Task `4.3` distribution smoke is blocked until the consumer pointer and Dotter materialization are updated outside this repository | ✅ | ✅ | WARNING | Confirmed external limitation |
| Strict RED→GREEN→REFACTOR history is not provable in the uncommitted worktree; policy disables strict TDD | ✅ | ✅ | WARNING | Confirmed limitation |
| Lock/concurrency evidence is focused smoke coverage, not exhaustive crash/stress proof | ✅ | ✅ | WARNING | Residual test-scope limitation |
| Acceptance QA remains a separate handoff and has no product target in this repository | ✅ | ✅ | WARNING | Explicit phase boundary; `sdd-qa` owns acceptance |

### SUGGESTION

- Add a machine-readable report contract alongside Markdown parsing if archive policy complexity grows.
- Add descendant-process timeout and stale-lock replacement race stress checks in a future test suite.
- Complete the external dotfiles/Dotter rollout before claiming three-environment distribution readiness.

## Limitations and handoff

- No production source or configuration defect was fixed during verification.
- No commits, PRs, dotfiles changes, or `.codegraph/` edits were made.
- The root harness has no application target or general test runner; this is technical conformance
  evidence only. `sdd-qa` remains the owner of observable acceptance and `qa-report.md`.
- Distribution is not claimed complete because the consumer pointer/effective materialization is stale.
- The exact requested source smoke and syntax commands all passed; no CRITICAL/P0/P1 issue remains.

## Verdict

**PASS WITH WARNINGS**

The remediated implementation passed all requested smoke/syntax commands and focused runtime checks,
including evidence containment/collision safety, recursive key/value/pattern redaction, complete
archive report gates, and conservative blocking-finding detection. The only remaining issues are the
documented external distribution limitation, unprovable strict TDD history, limited stress scope, and
the required handoff to independent `sdd-qa` acceptance verification.
