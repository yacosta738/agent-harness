# Apply Progress: Capability-Driven Agent Control Plane

## Status

Slice 1 completed. Tasks 1.1–1.6 are marked complete; the new control-plane
helpers remain opt-in and existing runner/FSM behavior remains compatible.

## Prior Attempt

The previous attempt ran the guard with `BASE=HEAD` and counted the pre-existing
dirty foundation:

```text
changed=762
BLOCKED: slice exceeds 400 changed lines
```

No production code, fixtures, schemas, manifests, tasks, or prior-change artifacts
were modified by that attempt.

## Review Workload Guard

This retry used the mandatory filesystem snapshot guard. The explicit Slice 1 paths
were snapshotted before mutation; `.codegraph/`, `opencode.json`, unrelated paths,
and `openspec/changes/deterministic-quality-runners-fsm` were excluded. Snapshot:

`/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice.clK5vQ`

The exact guard snapshot/compare commands used were:

```text
export SLICE_PATHS='["scripts/fixtures/control-plane","scripts/sdd-control-plane-smoke.sh","scripts/sdd-runner-lib/git-impact.mjs","scripts/sdd-runner-lib/evidence-boundary.mjs","scripts/sdd-runner-lib/stale.mjs","scripts/sdd-runner-lib/policy.mjs","scripts/sdd-runner-lib/toolchain.mjs","scripts/sdd-runner-lib/metrics.mjs","scripts/sdd-quality-runner.mjs","scripts/sdd-runner-lib/result.mjs","scripts/sdd-runner-lib/config.mjs","openspec/quality-runner.schema.json","openspec/quality-runner.json","openspec/config.yaml","openspec/quality-toolchain.lock","openspec/changes/capability-driven-agent-control-plane/tasks.md","openspec/changes/capability-driven-agent-control-plane/apply-progress.md","openspec/changes/capability-driven-agent-control-plane/state.yaml"]'
export EXCLUDE_PATHS='[".codegraph","openspec/changes/deterministic-quality-runners-fsm","opencode.json","plugins","prompts","skills",".agents","README.md"]'
node /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice.clK5vQ/guard.mjs compare /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice.clK5vQ/pre /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice.clK5vQ/red
post=/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice.clK5vQ/red changed=61
exit=0

node /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice.clK5vQ/guard.mjs compare /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice.clK5vQ/pre /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice.clK5vQ/final
post=/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice.clK5vQ/final changed=293
exit=0
```

The final guard reported the explicit Slice 1 delta as **293 changed lines**, below
the 400-line budget. Pre-existing runner/config changes are represented in the
snapshot baseline, not counted against this slice.

## TDD Evidence

- RED: fixture/smoke was created first and initially failed with
  `ERR_MODULE_NOT_FOUND` for the absent `git-impact.mjs` implementation; the focused
  smoke then exposed each remaining missing helper.
- GREEN: focused control-plane smoke passed after the minimum helper implementations.
- REFACTOR: new helpers were compacted without changing the smoke contract; focused
  smoke remained green.
- TDD is **not claimed**. `openspec/config.yaml` declares no root test runner; the
  fixture-first smoke is focused evidence only and cannot prove a full
  RED→GREEN→REFACTOR cycle.

## Commands

- `bash scripts/sdd-control-plane-smoke.sh` — passed.
- `bash scripts/sdd-quality-smoke.sh` — passed.
- `bash scripts/sdd-fsm-smoke.sh` — passed.
- `bash scripts/sdd-smoke.sh` — passed.
- `node --check scripts/sdd-quality-runner.mjs scripts/sdd-runner-lib/*.mjs` — passed.
- `bash -n scripts/*.sh` — passed.
- Control-plane runner integration with a temporary Git project and pinned Node
  toolchain — v2 identity-bound `PASS`.
- JSON parse for schema/manifests/lock/fixture — passed.
- `git diff --quiet -- opencode.json` — unchanged.
- The prior change was inspected and not mutated by this slice; its existing
  dirty/untracked state predates this retry and remains excluded from the guard.

## Handoff

Slice 1 is ready for `sdd-verify`. No commits, branches, or staging were used.
Temporary stdout/stderr files and generated fixture artifacts were cleaned by the
existing smoke traps. The prior `deterministic-quality-runners-fsm` change remains
untouched.

## Implementation Notes

- The existing runner continues to emit `quality-runner-result/v1`; the new evidence
  boundary exposes `quality-runner-result/v2` and an explicit v1 compatibility path,
  so manifests and invocations remain compatible while control-plane enforcement is
  off.
- Git impact is explicit base/head, `diff --name-status -z`, normalized/sorted POSIX
  changed-file scope, dirty-state reporting, stable digest, and symlink/traversal
  rejection. Finer function/boundary scope is explicitly unavailable.
- Policy recognizes `required`, `preferred`, and `disabled`, with named
  `FAST`/`STANDARD`/`FULL` profiles. Toolchain locks reject `latest`, ranges, and
  missing immutable digests. Metrics are normalizers/contracts only; no mutator is
  executed.

## CRITICAL Remediation — Slice 1 Only

### Scope and root causes

This remediation is limited to the four confirmed Slice 1 verification findings:

1. `stale.mjs` compared the envelope/candidate `head_sha` values but never resolved the
   repository's current `HEAD`.
2. `checkEvidenceFreshness` had no policy candidate/current digest comparison.
3. Artifact verification was skipped when `sha256` was falsy, allowing `null`/
   `UNAVAILABLE` artifacts to return `FRESH`.
4. `toolchain.mjs` used a permissive token regex, so range-like versions such as `1.x`
   were accepted.

### Fixture-first RED evidence

The pre-remediation snapshot was created before the regression changes. The exact guard
scope was:

```text
SLICE_PATHS=[
  "scripts/sdd-control-plane-smoke.sh",
  "scripts/sdd-runner-lib/stale.mjs",
  "scripts/sdd-runner-lib/toolchain.mjs",
  "openspec/changes/capability-driven-agent-control-plane/tasks.md",
  "openspec/changes/capability-driven-agent-control-plane/apply-progress.md",
  "openspec/changes/capability-driven-agent-control-plane/state.yaml"
]
EXCLUDE_PATHS=[".codegraph","openspec/changes/deterministic-quality-runners-fsm","opencode.json","plugins","prompts","dotfiles"]
snapshot=/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-remediation.4zg55m/pre
```

The smoke was extended first with minimal regressions for current `HEAD`, policy
candidate/current digest, unavailable artifact hash, missing Git, resolver injection,
and range-like toolchain versions. RED command and result:

```text
set +e; bash scripts/sdd-control-plane-smoke.sh > /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-remediation.4zg55m/red-control-plane.out 2>&1; rc=$?; printf 'exit=%s\n' "$rc"
exit=1
AssertionError: policy digest changes stale evidence: 'FRESH' !== 'STALE'
AssertionError: unavailable artifact hash is non-pass: actual 'FRESH'
AssertionError: missing Git head is non-pass: actual 'FRESH'
AssertionError: range-like toolchain versions are rejected: Missing expected exception: 1.x
AssertionError: repository HEAD changes stale evidence: 'FRESH' !== 'STALE'
```

The RED snapshot comparison was run with the mandatory filesystem guard and reported
`changed=31`, exit `0` (only the smoke regression fixture had changed at that point).

### Minimum implementation and GREEN evidence

- `stale.mjs` now resolves current `HEAD` from `projectRoot` or an injected compatible
  Git resolver, returns `UNAVAILABLE`/`BLOCKED` when Git cannot be resolved, compares
  candidate/current policy digests, and rejects unavailable/unverifiable/missing/non-file
  artifacts as non-pass.
- `toolchain.mjs` now accepts exact semantic versions only, while retaining provider,
  digest, and optional commit validation; it performs no downloads or resolution.
- `sdd-control-plane-smoke.sh` retains the four regression assertions plus resolver
  compatibility coverage.

GREEN command and result:

```text
bash scripts/sdd-control-plane-smoke.sh
control-plane: RED/GREEN contracts, identity, impact, stale, policy, lock, metrics, and boundary checks passed
```

The final mandatory filesystem snapshot comparison used the same explicit scope,
excluded paths, and pre snapshot above:

```text
node /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-remediation.4zg55m/guard.mjs compare /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-remediation.4zg55m/pre /var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-remediation.4zg55m/final
post=.../final changed=259
exit=0
```

The remediation delta is below the 400-line budget. No `git diff` against `HEAD` was
used as the slice baseline because the worktree is intentionally dirty.

### Requested command evidence

```text
bash scripts/sdd-control-plane-smoke.sh — PASS
bash scripts/sdd-quality-smoke.sh — PASS
bash scripts/sdd-fsm-smoke.sh — PASS
bash scripts/sdd-smoke.sh — PASS
node --check scripts/sdd-quality-runner.mjs scripts/sdd-fsm.mjs scripts/sdd-runner-lib/*.mjs — PASS
bash -n scripts/*.sh — PASS
JSON parse manifests/schema/lock/fixtures — PASS (7 files)
```

`opencode.json` remains unchanged with SHA-256
`41ccb9753d41f441911ee485dcf83fc382853c6653f51365e93321f754d3f00c`.
The `deterministic-quality-runners-fsm` change was excluded from the guard and no file
under that change was written. Temporary remediation output and the temporary path
manifest were removed after recording this evidence.

### TDD limitation and handoff

This is fixture-first regression evidence only. The repository still has no executable
root test runner, so full TDD is **not claimed**. The four verification findings are
remediated in Slice 1; future Slices 2–6 remain unchecked and out of scope. Technical
conformance must be regenerated by `sdd-verify`; this apply phase makes no product or
operator acceptance claim.

## Slice 2 — State Capsules, Requests, and Outcomes

### Scope

Tasks 2.1–2.2 only. Slice 1 evidence/policy/impact helpers, the existing runner/FSM, and the
previous `deterministic-quality-runners-fsm` change remain separate and untouched. This slice adds
pure built-ins-only contracts under `scripts/sdd-runner-lib/`; no contract writes files, creates a
queue, changes runtime permissions, or adds another runner/FSM/evidence store.

The existing `qa-report.md` remains unchanged and `BLOCKED`: Slice 1 has no final product/operator
target, authorized source→dotfiles→effective rollout, or executable authority contracts for the
deferred slices. Slice 2 implementation does not reopen, rewrite, or claim acceptance for that QA
result.

### Fixture-first RED evidence

The focused `scripts/sdd-control-plane-smoke.sh` was extended before the new modules existed. It
was run with the new imports and failed as expected because the contracts were absent:

```text
exit=1
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'/Users/acosta/Dev/agent-harness/scripts/sdd-runner-lib/capsule.mjs'
```

The mandatory filesystem snapshot guard was compared after RED with:

```text
SLICE_PATHS=["scripts/sdd-runner-lib/capsule.mjs","scripts/sdd-runner-lib/request.mjs",
"scripts/sdd-runner-lib/outcome.mjs","scripts/sdd-control-plane-smoke.sh",
"openspec/changes/capability-driven-agent-control-plane/tasks.md",
"openspec/changes/capability-driven-agent-control-plane/apply-progress.md",
"openspec/changes/capability-driven-agent-control-plane/state.yaml"]
EXCLUDE_PATHS=[".codegraph","opencode.json","plugins","prompts","skills","README.md",
"openspec/changes/deterministic-quality-runners-fsm"]
snapshot=/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/sdd-slice2.Iya12J/pre
compare=/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/sdd-slice2.Iya12J/red
post=.../red changed=364
exit=0
```

The guard uses the pre-mutation filesystem snapshot, not `git diff` against `HEAD`; its 364-line
RED count is below the 400-line limit.

### GREEN implementation

- `capsule.mjs` validates `capsule/v1` identity, phase/state, objective, impact/evidence refs,
  allowed actions/outcomes, required constraints, and stable SHA-256 digest. Unknown procedural
  fields are rejected; capsules remain current-state/objective/evidence/action/outcome context.
- `request.mjs` validates `request/v1` identity, capsule digest, expected revision/hash,
  idempotency key, and capsule-permitted actions. It rejects gate/authority claims and guards
  project-scoped payload paths from state, evidence, policy, lock, and toolchain mutation.
- `outcome.mjs` validates `outcome/v1` statuses, evidence refs, revision, and identity. Only
  runner/FSM outcomes with current identity, current revision, valid evidence refs, and PASS
  evidence can be authoritative; agent/prose PASS, claimed waivers, stale/foreign evidence, and
  missing evidence become non-authoritative `BLOCKED`, `STALE`, or `UNAVAILABLE` outcomes.
- The request module documents that path checks are pure contract guards; OS/runtime permission
  enforcement remains a Slice 5 concern.

### GREEN / compatibility evidence

```text
bash scripts/sdd-control-plane-smoke.sh — PASS
bash scripts/sdd-quality-smoke.sh — PASS
bash scripts/sdd-fsm-smoke.sh — PASS
bash scripts/sdd-smoke.sh — PASS
node --check scripts/sdd-quality-runner.mjs scripts/sdd-fsm.mjs scripts/sdd-runner-lib/*.mjs — PASS
bash -n scripts/*.sh — PASS
JSON/fixture parse (4 files) — PASS
opencode.json SHA-256 unchanged: 41ccb9753d41f441911ee485dcf83fc382853c6653f51365e93321f754d3f00c
prior change status inspected only; no file under deterministic-quality-runners-fsm was written
```

The final mandatory guard was run after implementation and after the full smoke set:

```text
snapshot=/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/sdd-slice2.Iya12J/final
post=.../final changed=202
exit=0
```

The implementation snapshot was 202 changed lines. Updating this cumulative progress artifact was
also included in the explicit Slice 2 paths; the final post-documentation guard was rerun and
reported 305 changed lines, still below the 400-line budget. The final constructor also clears
agent-supplied `accepted` and `authoritative` claims before runner/FSM evaluation:

```text
snapshot=/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/sdd-slice2.Iya12J/final-complete
post=.../final-state changed=305
exit=0
```

Temporary output was kept only in the approved temporary directory and contains no secrets; no
commits, branches, staging, or global configuration changes were used.

### TDD limitation and handoff

This is fixture-first RED/GREEN evidence plus syntax and smoke verification. The repository has no
root executable test runner, so full RED→GREEN→REFACTOR TDD compliance is **not claimed**. The
existing Slice 1 QA report remains unchanged and `BLOCKED`; it is not acceptance evidence for this
slice. `sdd-verify` must regenerate technical conformance, and `sdd-qa` must rerun independently;
apply makes no product/operator acceptance claim.

## Slice 2 — CRITICAL remediation only

### Scope

This remediation is limited to the seven CRITICAL contract edges reported by the current
`verify-report.md`: required capsule/request digests, recursive authority aliases, escaping request
symlinks, complete evidence envelopes, evidence revision matching, and non-forgeable runner outcome
authority. Slices 3–6 remain out of scope. `verify-report.md` and `qa-report.md` were not edited.

### Fixture-first RED

Before production changes, `scripts/sdd-control-plane-smoke.sh` gained regressions for all seven
boundaries: missing capsule/request digests, nested `pass`/`result: PASS`/`claimed_waiver`/
`approve_waiver`, an escaping symlink under `projectRoot`, minimal invalid evidence, evidence
revision mismatch, and a self-forged runner outcome. The smoke was run and failed with exit `1`.
The observed RED included:

```text
missing capsule digest is rejected: Missing expected exception.
missing request digest is rejected: Missing expected exception.
nested authority aliases are rejected: pass — true !== false
escaping request symlink is rejected: true !== false
minimal evidence cannot authorize PASS: actual 'PASS'
evidence revision must match outcome revision: actual 'PASS'
```

The mandatory pre-remediation filesystem snapshot was created in:
`/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice2-guard.09xyNF/pre`.
The explicit guard scope was `capsule.mjs`, `request.mjs`, `outcome.mjs`,
`evidence-boundary.mjs`, `sdd-control-plane-smoke.sh`, this change's `tasks.md`,
`apply-progress.md`, and `state.yaml`; `.codegraph`, `opencode.json`, plugins, prompts, skills,
README, and `deterministic-quality-runners-fsm` were excluded. The RED smoke fixture delta was
recorded before GREEN and remained within the 400-line budget (`changed=1`).

### Minimum implementation and GREEN

- `capsule.mjs` now requires a 64-character SHA-256 `capsule_digest`, checks exact canonical
  equality, and computes it before validation in `createCapsule`.
- `request.mjs` now requires and verifies `request_digest`; accepts optional `projectRoot` for
  guard/request constructors; normalizes recursive authority keys and write/transition/force
  aliases; and checks existing ancestors with `realpath` containment, returning
  `path_containment_unavailable` when containment cannot be verified.
- `evidence-boundary.mjs` now exports `evidenceDigest` and `validateEvidenceEnvelope`, excludes
  mutable `files` (and lookup-only `ref`) from the canonical envelope digest, supports optional
  capsule digest/revision fields, preserves v1 upgrade behavior, and requires valid identity,
  impact/config/command/toolchain digests, timestamp, status, envelope digest, and artifact hashes.
- `outcome.mjs` now validates real v2 envelopes, capsule identity, revisions, artifact proof and
  freshness under `projectRoot`; missing freshness context is `UNAVAILABLE`; result digests are
  recalculated; and authority is held in a process-local `WeakSet`, so serialized outcomes need
  reevaluation.
- The happy path constructs a valid v2 envelope with revision/capsule digest and a legal empty
  artifact array. Existing runner/FSM behavior and visible fallback remain unchanged.

GREEN evidence:

```text
bash scripts/sdd-control-plane-smoke.sh — PASS
control-plane: RED/GREEN contracts, identity, impact, stale, policy, lock, metrics, and boundary checks passed
```

The final guard snapshot was taken after implementation and the full smoke set in the same explicit
scope. The final compare from the pre-remediation snapshot was `changed=331`, below 400; no Git diff against `HEAD`, staging, commits,
or branches were used. Temporary smoke output contains no secrets and remains only under the
approved temporary directory.

### Required compatibility verification

```text
bash scripts/sdd-quality-smoke.sh — PASS
bash scripts/sdd-fsm-smoke.sh — PASS
bash scripts/sdd-smoke.sh — PASS
node --check scripts/sdd-quality-runner.mjs scripts/sdd-fsm.mjs scripts/sdd-runner-lib/*.mjs — PASS
bash -n scripts/*.sh — PASS
```

`opencode.json` and the prior `deterministic-quality-runners-fsm` change remain untouched. The
existing QA report remains unchanged and `BLOCKED`; technical conformance must be regenerated by
`sdd-verify`, and this apply phase makes no product/operator acceptance claim.

### TDD limitation and handoff

This is fixture-first regression RED/GREEN evidence plus syntax and smoke verification. The
repository still has no executable root test runner, so full RED→GREEN→REFACTOR TDD compliance is
**not claimed**. `sdd-verify` is the next phase and owns regeneration of the technical verification
report; `sdd-qa` independently owns acceptance evidence.

## Slice 3 — Durable Queue, Event Log, and Recovery

### Scope and workload guard

Tasks 3.1–3.2 only. The approved delivery boundary is the existing `sequential local slices`
strategy: no commits, branches, staging, PR topology, global enforcement, or Slice 4–5 work. The
mandatory filesystem baseline is
`/var/folders/zz/d4kl1hfj1j15nxm43d24px300000gn/T/opencode/sdd-slice3.GBvBEI/pre`.
`SLICE_PATHS` covered `scripts/sdd-handoff.mjs`, `scripts/sdd-handoff-smoke.sh`, optional handoff/event
helpers, this change's handoff/event paths, `tasks.md`, `apply-progress.md`, and `state.yaml`.
`.codegraph`, `opencode.json`, plugins, prompts, skills, `.agents`, README, and
`deterministic-quality-runners-fsm` were excluded.

Fixture-first RED failed with exit 1 because `scripts/sdd-handoff.mjs` did not exist
(`MODULE_NOT_FOUND`). The RED snapshot compare reported `changed=66`, exit 0. After the minimum
implementation and refactor, the focused smoke passed; the pre-documentation guard reported
`changed=221`, exit 0. The final cumulative compare reported `changed=283`, exit 0, below the
400-line budget.

### Implementation

- `scripts/sdd-handoff.mjs` provides explicit-change `enqueue`, `claim`, `complete`, `fail`, `list`,
  `inspect`, `recover`, and forced `replay` actions over `handoff/v1` JSON identities and digests.
- Change and per-handoff locks use atomic `mkdir`/`open(wx)` plus rename-based stale-lock exchange;
  lock owners record PID, host, and time. Claim enforces revision/idempotency bindings and one
  `in_process` handoff per change/task unless force plus an expired TTL are both supplied.
- Queue transitions are helper-owned and change-scoped. Recovery moves expired claims to `failed`
  with `recovery_timeout`; replay retains an archival copy before returning a handoff to `new`.
- `events.jsonl` uses lock-serialized `appendFileSync` writes, contiguous sequence numbers, immutable
  prior lines, payload hashes, actor provenance, and the six declared handoff event types.
- `--link-fsm` is opt-in. A `verify_ready`/`qa_ready` claim attempts the existing FSM; unavailable or
  rejected FSM state yields `claim_failed` without affecting the normal agent flow.

### GREEN and compatibility evidence

```text
bash scripts/sdd-handoff-smoke.sh — PASS
bash scripts/sdd-control-plane-smoke.sh — PASS
bash scripts/sdd-quality-smoke.sh — PASS
bash scripts/sdd-fsm-smoke.sh — PASS
bash scripts/sdd-smoke.sh — PASS
node --check scripts/sdd-quality-runner.mjs scripts/sdd-fsm.mjs scripts/sdd-handoff.mjs scripts/sdd-runner-lib/*.mjs — PASS
bash -n scripts/*.sh — PASS (plus per-file syntax loop)
JSON parse manifests/schema/lock — PASS (6 files)
```

The smoke covers missing change identity, happy path, duplicate task claims, duplicate idempotency,
change/task/revision/state mismatches, traversal, live/stale locks, recovery timeout, forced archival
replay, FSM fallback, concurrent writers, ordered sequence numbers, and append-only event prefixes.
The feature flags remain off. `opencode.json` stayed at SHA-256 `41ccb9753d41f441911ee485dcf83fc382853c6653f51365e93321f754d3f00c`; the prior-change tree stayed at SHA-256 `06f671a8fbc9ebfd3dcf05a3cd64e6276f23b448366f63889d152ea384be285e`, matching pre-slice baselines.
Existing verify and QA reports were not edited; QA remains `BLOCKED` for the absent target, external rollout, and deferred Slices 4–5. Full TDD and product/operator
acceptance are not claimed because this repository has no executable root test runner.

