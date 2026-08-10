# Verification Report

**Change**: `capability-driven-agent-control-plane`
**Scope**: Slices 1–3 (tasks `1.1`–`3.2`). This report UPDATES the previous Slice 1–2 report and adds the first verification of Slice 3 (durable handoffs, event log, recovery, replay, and `--link-fsm`).
**Mode**: `openspec`
**Environment**: `/Users/acosta/Dev/agent-harness`, macOS Darwin arm64, Node `v24.16.0`, Bash, Git
**Phase boundary**: Technical conformance only. This report does not claim product, operator, distribution, or acceptance completion; `sdd-qa` owns the next acceptance run.
**Skill resolution**: `fallback-path` — phase skill and shared SDD protocol loaded from the explicit SDD paths

## Sources and isolation

Before judging implementation, this phase read:

- `exploration.md`, `proposal.md`, `design.md`, `tasks.md`, and the full updated `apply-progress.md` (including the Slice 3 section)
- all four delta specs under `specs/`
- the previous `verify-report.md` (Slice 1–2 scope, `PASS WITH WARNINGS`)
- existing `qa-report.md` (read-only; regenerated at 19:15 by a prior QA pass, not by this phase)
- `openspec/config.yaml`, `quality-runner.json`, `quality-runner.schema.json`, and `quality-toolchain.lock`
- `scripts/sdd-quality-runner.mjs`, `scripts/sdd-fsm.mjs`, `scripts/sdd-handoff.mjs`, all `scripts/sdd-runner-lib/*.mjs`, and the smoke scripts

Verification did not edit production code, fixtures, manifests, `opencode.json`, the prior change, dotfiles, global configuration, or `qa-report.md`. Only this report and this change's `state.yaml` were persisted.

| Isolation check | Baseline | Now | Result |
|---|---|---|---|
| `opencode.json` SHA-256 | `41ccb9753d41f441911ee485dcf83fc382853c6653f51365e93321f754d3f00c` | same | ✅ unchanged; mtime `08:10` predates the apply window |
| Prior-change `state.yaml` SHA-256 | `6c33426aecf2ec47b9b15c5b4cf11e21dde1b3b0916559a319ad9a296304e254` | same | ✅ unchanged |
| Prior-change git status hash | `b9522383bf28c4b8b894d3f104d311d9f91eef55f3c2e33d1567598b675f2444` | same | ✅ unchanged |
| Prior-change file mtimes | ≤ `15:39:49` | same | ✅ all predate this change's apply window (15:50+) |
| `qa-report.md` SHA-256 | `1a5588648708dd834e67e8adeec1347f3aa7f8eefa72dfe88e7d4bdae22af4d8` | same | ✅ not modified by this phase |
| This change `events.jsonl` | 0 bytes | same | ✅ runtime artifact; smokes run against temp projects |
| This change `handoffs/` JSON files | 0 | same | ✅ only `.gitkeep` buckets exist; no real queue rows |
| `~/.config/opencode/opencode.json` | mtime Aug 6 | same | ✅ untouched |
| Protected scopes (prompts, commands, README, skills) | mtimes `14:00`–`14:44` | same | ✅ pre-existing dirty state predates the apply window |

The `--link-fsm` success probe ran against a **temporary project** with harness scripts symlinked in; it did not touch this change's real `state.yaml` or `events.jsonl`. No second runner, FSM, or evidence store was introduced: `sdd-handoff.mjs` uses the existing `sdd-fsm.mjs` opt-in via `--link-fsm`.

## Completeness

| Scope | Tasks total | Complete | Incomplete | Judgment |
|---|---:|---:|---:|---|
| Slice 1 (`1.1`–`1.6`) | 6 | 6 | 0 | ✅ Complete; regression-free |
| Slice 2 (`2.1`–`2.2`) | 2 | 2 | 0 | ✅ Complete after runtime remediation |
| Slice 3 (`3.1`–`3.2`) | 2 | 2 | 0 | ✅ Complete; first verification in this report |
| Entire change (`1.1`–`6.2`) | 16 | 10 | 6 | ⚠️ Slices 4–6 explicitly deferred, not evaluated as implemented scope |

Deferred tasks are `4.1`, `4.2`, `5.1`, `5.2`, `6.1`, and `6.2`: real capability adapters, finer scope semantics, runtime permissions/prompts and human waivers, and distribution plus final acceptance. They remain visible as deferred/untested and are not promoted by this report.

## Build, tests, syntax, and runtime evidence

`openspec/config.yaml` declares no repository test runner, build/type-check command, or coverage threshold. Strict TDD is `false`. No broad build or coverage command was available.

| Command / probe | Result | Runtime evidence |
|---|---|---|
| `bash scripts/sdd-handoff-smoke.sh` | ✅ PASS, exit `0` | Slice 3: enqueue/claim/complete, authority, locks, recovery, replay, and append-only event checks passed |
| `bash scripts/sdd-control-plane-smoke.sh` | ✅ PASS, exit `0` | Slice 1–2 identity/impact/stale/policy/lock/metrics plus digest, recursive authority, symlink, evidence, revision, and authority regressions passed |
| `bash scripts/sdd-quality-smoke.sh` | ✅ PASS, exit `0` | Existing argv/shell, artifact, environment isolation, redaction, unavailable, timeout, parser, threshold, and skip behavior passed |
| `bash scripts/sdd-fsm-smoke.sh` | ✅ PASS, exit `0` | Existing transition, idempotency, stale revision, concurrency, stale lock, atomicity, and archive-gate behavior passed |
| `bash scripts/sdd-smoke.sh` | ✅ PASS, exit `0` | Existing manifest, fallback, redaction, unavailable, timeout, threshold, report-fixture, and project-safe path contracts passed |
| `node --check scripts/sdd-quality-runner.mjs scripts/sdd-fsm.mjs scripts/sdd-handoff.mjs scripts/sdd-runner-lib/*.mjs` | ✅ PASS, exit `0` | All requested ES modules parsed, including the new `sdd-handoff.mjs` |
| `bash -n scripts/*.sh` | ✅ PASS, exit `0` | All repository shell scripts parsed |
| JSON parse (3 files) | ✅ PASS | Schema, manifest, and toolchain lock parsed with `JSON.parse` |
| `--link-fsm` success probe | ✅ PASS | Temporary Git project: claim reached `in_process`, FSM transitioned `apply`→`verify` (revision `0`→`1`, `completed` gained `verify`, `next: qa`), `last_idempotency_key` recorded |
| `--link-fsm` fallback probe | ✅ PASS | Missing FSM script yields `claim_failed` (`fsm_link_failed`), matching the smoke's documented fallback path; normal agent flow unaffected |
| FAST/FULL profile probe | ✅ PASS | `FAST`→`tests`, `STANDARD`→`tests,coverage`, `FULL`→`tests,coverage,mutation,architecture`; invalid profile rejected; `disabled` stays `NOT_TESTED` |
| Redaction probe | ✅ PASS | Literal secrets and `api_key` patterns redacted in stdout and nested values |
| Runner v1/v2 compat check | ✅ PASS | `result.mjs` exports `RUNNER_RESULT_VERSION='quality-runner-result/v1'` and `CONTROL_PLANE_RESULT_VERSION='quality-runner-result/v2'`; v1 emission preserved |
| Handoff envelope serialization probe | ✅ PASS | A prior probe reported a repeated `created_at` in `enqueue` stdout. This run re-checked: `enqueue` emits exactly one object (`version`, `change`, `accepted`, `handoff`), and a duplicate-key detector found **no duplicated keys at the same object level** (`created_at` count `1` in stdout and in the on-disk `inbox/new/*.json`; the single `version: 2` hit was the top-level envelope `version` plus the nested handoff `version`, distinct levels, not a duplicate). Prior observation was a probe artifact; no serialization defect exists. |

No test command exited non-zero. No repository build/type-check/coverage tooling exists; these limitations are warnings, not hidden passes.

## Slice 3 runtime contract evidence

Verified by executing `sdd-handoff.mjs` actions plus the smoke and probes:

1. `enqueue` validates change identity, derives `handoff/v1` digest, persists to `handoffs/inbox/new`, and records an append-only event.
2. `claim` enforces revision/idempotency bindings, one `in_process` handoff per change/task, and atomic queue transitions; duplicate claims and mismatched revisions are rejected.
3. Change and per-handoff locks use atomic `mkdir`/`open(wx)` with stale-lock exchange; lock owners record PID, host, and time.
4. `recover` moves expired claims to `failed` with `recovery_timeout`; `replay` keeps an archival copy before returning a handoff to `new`.
5. `events.jsonl` writes are lock-serialized and append-only, with contiguous sequence numbers, payload hashes, actor provenance, and the six declared handoff event types; smoke verified ordered sequence numbers and immutable prior lines.
6. `--link-fsm` is opt-in. On `verify_ready`, a successful link ran the existing FSM transition (`apply`→`verify`) and the claim completed with `in_process`; when the FSM is unavailable, the claim degrades to `claim_failed` without corrupting queue state.

## Spec compliance matrix

`COMPLIANT` means that an executable scenario covering the behavior passed at runtime. Deferred QA/product scenarios are intentionally not promoted.

### Delta spec scenarios (Slices 1–2, re-confirmed this run)

| Requirement | Scenario | Covering runtime evidence | Result |
|---|---|---|---|
| Evidence trust boundary | Valid evidence envelope | `sdd-control-plane-smoke.sh` | ✅ COMPLIANT |
| Evidence trust boundary | Incomplete or foreign identity | Identity-matching regressions | ✅ COMPLIANT |
| Evidence trust boundary | HEAD or scope changed | Current-HEAD/impact freshness probes | ✅ COMPLIANT |
| Evidence trust boundary | Configuration or artifact changed | Config/command/toolchain/artifact freshness probe | ✅ COMPLIANT |
| Evidence trust boundary | Path traversal attempt | Traversal + escaping-symlink regressions | ✅ COMPLIANT |
| Evidence trust boundary | Agent prose claims pass | Outcome regressions for `agent`/`prose` | ✅ COMPLIANT |
| Change impact set | Reproducible changed paths | Control-plane smoke digest recomputation | ✅ COMPLIANT |
| Change impact set | Changed and affected scopes | Git impact and metrics contract smoke | ✅ COMPLIANT |
| Change impact set | Shallow or missing repository | Missing-Git probe returned `UNAVAILABLE` | ✅ COMPLIANT |
| Change impact set | Adapter mapping is absent | Metrics smoke preserves changed-file scope | ✅ COMPLIANT |
| Change impact set | Malicious path input | Traversal and symlink regressions | ✅ COMPLIANT |
| Capability policy | Profile selection | `FAST`/`STANDARD`/`FULL` probe | ✅ COMPLIANT |
| Capability policy | No manifest or adapter | Existing runner fallback | ✅ COMPLIANT |
| Capability policy | Required, preferred, and disabled | Policy smoke: `BLOCKED`, `UNAVAILABLE`, `NOT_TESTED` | ✅ COMPLIANT |
| Capability policy | Unpinned or latest toolchain | Exact-version/range rejection regressions | ✅ COMPLIANT |
| Capability policy | Metric adapter boundary | CRAP/mutation/DRY/acceptance normalizers | ⚠️ PARTIAL — contract-only; Slice 4 deferred |
| Capability policy | Agent claims a gate | Recursive request guard and outcome authority | ✅ COMPLIANT |
| Capability policy | Human waiver boundary | No human-only waiver adapter exists by design | ⏳ UNTESTED — Slice 5 deferred |
| Acceptance QA delta | Compatible technical handoff | Runner/FSM compatibility smokes + v2 contract probe | ⚠️ PARTIAL — full FSM/archive wiring remains later integration |
| Acceptance QA delta | Separate active changes | Isolation hashes and unchanged prior state | ✅ COMPLIANT |
| Acceptance QA delta | No fabricated pass | Invalid/stale/foreign/agent/waiver/forged probes | ✅ COMPLIANT |
| Acceptance QA delta | Auditable completion | This report persisted with command, identity, digest evidence | ⚠️ PARTIAL — independent QA report must be rerun |
| Acceptance QA delta | Archive decision | Existing FSM archive checks passed | ⚠️ PARTIAL — QA owns acceptance closure |

**Delta compliance summary**: `18/23` compliant, `4` partial, `1` untested, `0` failing — unchanged from the Slice 1–2 report and re-confirmed.

### Slice 3 scope (tasks `3.1`–`3.2` + design slice 3)

The delta specs declare durable handoffs/events as *future contracts*, so Slice 3 is verified against the design and tasks contract rather than fabricated spec scenarios:

| Contract | Covering runtime evidence | Result |
|---|---|---|
| Handoff identity + digest (`handoff/v1`) | Handoff smoke enqueue/claim/complete checks | ✅ COMPLIANT |
| Atomic claim, one `in_process` per change/task | Duplicate claim and idempotency checks | ✅ COMPLIANT |
| Revision/idempotency binding | Duplicate idempotency and mismatch checks | ✅ COMPLIANT |
| Locks: live/stale exchange, owner metadata | Live/stale lock checks | ✅ COMPLIANT |
| Recovery: expired → `failed` with `recovery_timeout` | Recovery-timeout check | ✅ COMPLIANT |
| Forced replay with archival copy | Forced-archival replay check | ✅ COMPLIANT |
| Append-only event log, sequence, hashes, provenance | Ordered-sequence and immutable-prefix checks | ✅ COMPLIANT |
| FSM opt-in link, success and graceful fallback | `--link-fsm` success probe + fallback check | ✅ COMPLIANT |
| No second FSM/runner/evidence store | Entrypoint/store inspection + probe isolation | ✅ COMPLIANT |

## Correctness assessment

| Contract / area | Status | Evidence and judgment |
|---|---|---|
| Capsule identity and bounded fields | ✅ Implemented | Field allowlist and validation passed (Slice 2, re-confirmed) |
| Capsule/request canonical digests | ✅ Implemented | Required digest, exact recomputation, tamper regressions passed |
| Recursive authority/write guards | ✅ Implemented | Nested PASS/result/waiver and write aliases rejected |
| Request realpath containment | ✅ Implemented | Escaping symlinks rejected |
| Evidence v2 envelope + freshness | ✅ Implemented | Envelope, identity, digests, artifact proof validated |
| Outcome authority provenance | ✅ Implemented | Process-local `WeakSet`; serialized/forged outcomes rejected |
| Handoff identity and digest | ✅ Implemented | `handoff/v1` JSON identities with digests |
| Atomic queue transitions | ✅ Implemented | Helper-owned, change-scoped transitions; duplicate claims rejected |
| Lock correctness | ✅ Implemented | Atomic `mkdir`/`open(wx)` + stale-lock rename exchange |
| Recovery and forced replay | ✅ Implemented | Expired→`failed`; replay archives before requeue |
| Event log integrity | ✅ Implemented | Lock-serialized append-only, contiguous sequences, payload hashes |
| FSM opt-in linkage | ✅ Implemented | `verify_ready`/`qa_ready` claims attempt FSM; failure degrades cleanly |
| Pure contract side effects | ✅ Implemented | Runtime probes found no state/evidence/policy/lock/toolchain writes outside queue dirs |
| OS/runtime permission enforcement | ⏳ Deferred | Explicit Slice 5 scope |
| Real adapters / distribution | ⏳ Deferred | Slices 4 and 6 |

## Design coherence

| Design decision | Followed? | Evidence / limitation |
|---|---|---|
| Reuse existing runner/FSM; no second engine | ✅ Yes | Existing smokes pass; `--link-fsm` invokes the existing `sdd-fsm.mjs` |
| Handoffs/event log as Slice 3 coordination, without a second FSM | ✅ Yes | `sdd-handoff.mjs` queue + `events.jsonl`; FSM only opt-in |
| Capsules/requests/outcomes as pure contracts | ✅ Yes | Validation-only; write-isolation probes passed |
| Code, not agent prose, owns PASS authority | ✅ Yes | Evidence, freshness, provenance checks passed |
| Feature flags off by default and visible fallback | ✅ Yes | `quality_runner`, `control_plane`, `workflow_fsm` remain disabled; fallback visible |
| Do not modify `opencode.json` or prior change | ✅ Yes | Hash/status/mtime isolation checks passed |
| Real adapters, prompts, waivers, distribution, and product acceptance stay deferred | ✅ Yes | No deferred capability was implemented or promoted |

## TDD and tooling audit

| Audit item | Status |
|---|---|
| Strict TDD mode | ➖ Inactive; `openspec/config.yaml` says `strict_tdd: false` |
| Fixture-first RED evidence | ✅ Recorded in `apply-progress.md` for Slices 1–3; RED failures (e.g. `MODULE_NOT_FOUND` for absent modules) preceded GREEN |
| Full RED→GREEN→REFACTOR repository proof | ⚠️ Not claimed; no root test runner or commit baseline exists |
| Root test runner/build/type-check | ⚠️ Not configured |
| Coverage | ➖ Not configured / not run |

## Findings

### CRITICAL / P0 / P1 technical

None.

### WARNING

1. Slices 4–6 remain incomplete and intentionally deferred: real capability adapters, finer scope semantics, runtime permissions/prompts, human-only waivers, distribution, and final acceptance.
2. The delta specs declare durable handoffs/events as *future contracts* while Slice 3 implemented them per design/tasks. The specs were not extended with handoff/event scenarios before implementation; the next spec update should add them (e.g. as part of Slice 6 finalization).
3. The request module is a pure contract guard; it does not establish OS/runtime permission enforcement. Do not interpret this report as Slice 5 evidence.
4. No real adapters, prompt integration, human waiver path, source→dotfiles→effective rollout, or product/operator target were exercised.
5. The existing `qa-report.md` (regenerated 19:15) was deliberately not modified by this phase. `sdd-qa` must rerun after this Slice 3 verification; its `BLOCKED` distribution result is not acceptance closure.
6. No root build/type-check/coverage runner exists, and full repository TDD chronology cannot be proven.
7. Root feature flags remain off; local fallback is observable and is not deterministic root enforcement.

### SUGGESTION

1. Run `sdd-qa` next and preserve the acceptance boundary, including its existing target/distribution limitations.
2. Add handoff/event-log scenarios to the delta specs in a later slice to close the spec drift noted in WARNING 2.
3. Keep future FSM wiring, adapters, permissions, waivers, and distribution in their declared slices rather than widening this scope.

## Judge table

| Finding | Judge A | Judge B | Severity | Status |
|---|---|---|---|---|
| Slice 3 handoff queue (identity, claim, locks, recovery, replay) | ✅ Smoke passed end-to-end | ✅ Atomic transitions + stale-lock exchange verified | CRITICAL check | Verified |
| Append-only event log integrity | ✅ Ordered sequence + immutable prefix passed | ✅ Lock-serialized append + payload hashes | CRITICAL check | Verified |
| `--link-fsm` success path | ✅ FSM `apply`→`verify` transition in probe | ✅ Claim completed `in_process` with revision `1` | CRITICAL check | Verified |
| `--link-fsm` graceful fallback | ✅ `claim_failed` without queue corruption | ✅ Unavailable FSM degrades cleanly | CRITICAL check | Verified |
| Slice 1–2 remediation regressions | ✅ All smokes re-passed | ✅ Digests/authority/freshness guards intact | CRITICAL check | Verified / re-confirmed |
| No second runner/FSM/evidence store | ✅ Only existing paths + opt-in link | ✅ Probe isolation confirmed | SUGGESTION | Verified |
| Isolation (opencode.json, prior change, QA report) | ✅ Hashes/mtimes unchanged | ✅ No verification command wrote protected scopes | SUGGESTION | Verified |
| Spec drift: handoffs/events declared future in specs but implemented in Slice 3 | ⚠️ Spec text not updated | ⚠️ Design/tasks scoped Slice 3 explicitly | WARNING | Info — spec update recommended |
| Deferred adapters/permissions/waivers/distribution/product acceptance | ⏳ Not exercised | ⏳ Explicitly outside Slices 1–3 | WARNING | Deferred / untested |

## Verdict

**PASS WITH WARNINGS**

Slices 1–2 remain green and Slice 3 (durable handoffs, event log, recovery, replay, and opt-in FSM linkage) now passes the requested runtime checks: the full smoke suite, syntax checks, the `--link-fsm` success and fallback probes, profile resolution, redaction, and isolation markers. No technical CRITICAL/P0/P1 finding remains in the evaluated scope (tasks `1.1`–`3.2`); deferred capabilities, spec-drift documentation, and independent acceptance remain visible and are handed off to `sdd-qa`.

## Handoff and limitations

- No code or fixes were made during verification.
- `qa-report.md` was not modified; `sdd-qa` owns its independent rerun and acceptance verdict.
- Do not promote OS/runtime permissions, real adapters, prompt integration, human waivers, distribution, or product/operator acceptance.
- The prior `deterministic-quality-runners-fsm` change remains separate at `qa`; `opencode.json` remains unchanged.
- `state.yaml` for this change was updated to `current_phase: verify`, `next: qa`.
- The next phase is `qa`.
