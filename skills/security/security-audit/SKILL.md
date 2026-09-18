---
name: security-audit
description: >
  Orchestrate a multi-phase security audit of a codebase. Chains the existing
  security skills ($threat-model → $finding-discovery → $triage-finding →
  $fix-finding) and adds structured-output, independent-verification, and
  target-neutral reporting phases. Use when the user asks to audit or pen-test
  a target repo, requests a full/comprehensive/end-to-end security review, or
  asks for report artifacts. For focused questions or single-finding work,
  prefer the individual skills directly — do not invoke the orchestrator.
license: MIT
---

# Security Audit Orchestrator

Find vulnerabilities that violate a real trust boundary, then give owners the source
evidence, safe reproduction, priority, and smallest effective fix. This is a defensive,
source-first workflow. A candidate without a concrete affected principal, resource, or
security outcome is not a confirmed finding.

## Objective

Coordinate a six-phase security audit of one target repo. Phases 1–3 reuse the existing
single-purpose skills (`$threat-model`, `$finding-discovery`, `$triage-finding`) so the
proven per-phase contracts keep working; Phases 4–6 are new and live in this orchestrator
(structured `findings.json`, independent record verification, target-neutral reporting).

## Operating modes

This skill is guidance by default. Loading it does **not** authorize the complete audit
workflow or file creation.

- **Guidance mode** — security questions, focused reviews, methodology, or single-finding
  work. Use the relevant phase or skill directly. Do not create an output directory, do
  not write audit artifacts. You may dispatch a focused sub-agent (`security-engineer`)
  for bounded investigation; results return to the current task.
- **Full audit mode** — user explicitly asks to audit or pen-test a codebase, asks for a
  full/comprehensive/end-to-end security review, or requests report artifacts. Run all
  six phases and write the artifacts defined below.

If the request could mean either mode, ask one focused question before creating files or
starting the complete workflow.

## Inputs

- `target` (required) — absolute repository root under review.
- `scope_paths` (optional) — repository-relative paths to limit the audit. Default: full
  repo.
- `profile` (optional) — one of `quick`, `standard`, `deep`. Default `standard`. See
  *Run profiles and scope* below.
- `budget` (optional) — maximum number of agent invocations across all phases. If unset,
  no hard limit; the orchestrator still applies the strict pre-reconnaissance gate.
- `output_dir` (optional) — absolute parent directory for new run outputs. Default
  `~/security-audit-skill/<repo-name>/run-<N>` where `<N>` is the next unused integer.
  Must be outside the target repo unless the user explicitly selects an in-tree path
  that version control ignores.
- `prior_runs` (optional) — absolute paths to prior `findings.json` and
  `coverage_ledger.json` to carry forward unchanged confirmed findings.

If the target repo path or output dir is ambiguous, ask before proceeding. Do not guess
the boundary of the audit.

## Path conventions

This orchestrator's artifact paths derive from `_shared/scan-artifacts.md`. Use those
base paths verbatim. Map the upstream orchestrator's files into this layout:

| Upstream artifact | This harness path |
|---|---|
| `architecture.md` | `<context_dir>/architecture.md` |
| `coverage-ledger.json` | `<coverage_dir>/coverage_ledger.json` |
| `findings.json` | `<findings_dir>/findings.json` |
| `run-metadata.json` | `<scan_dir>/run-metadata.json` |
| `REPORT.md` | `<scan_dir>/REPORT.md` |
| `FINDINGS-DETAIL.md` | `<scan_dir>/FINDINGS-DETAIL.md` |
| `NEEDS-VALIDATION.md` | `<scan_dir>/NEEDS-VALIDATION.md` |
| `<output_dir>/agents/<agent-id>/{scratch,artifacts}/` | `<scan_dir>/agents/<agent-id>/{scratch,artifacts}/` |

`<context_dir>`, `<discovery_dir>`, `<coverage_dir>`, `<reconciliation_dir>`,
`<findings_dir>`, `<scan_dir>` are defined in `_shared/scan-artifacts.md`. Do not invent
new base paths.

Hunter / verifier scratch roots still live under `<scan_dir>/agents/<agent-id>/scratch/`;
the orchestrator owns `<scan_dir>/agents/<agent-id>/artifacts/`. Both agent IDs must be
canonical filesystem-safe lowercase (`^[a-z0-9][a-z0-9_-]{0,63}$`) and must not collide
with Windows device names (`con`, `prn`, `aux`, `nul`, `com1`–`com9`, `lpt1`–`lpt9`).

## Workflow (six phases)

Run all six phases in order in full audit mode. Do not end the run before one of exactly
two terminal states:

1. All Phase 6 artifacts are written and both validators pass.
2. `run_status: "incomplete"` is recorded in `run-metadata.json` with its exact reason
   and the gap is disclosed in `REPORT.md`.

Never stop mid-phase.

### Phase 1 — Reconnaissance

Goal: produce the threat model and architecture map, initialize `run-metadata.json`.

1. Initialize `<scan_dir>` and write `run-metadata.json` with `run_id`, `repo`, `target`,
   `source_ref`, `profile`, `scope_paths`, `budget` (null if unset),
   `execution_policy: "sandboxed-source-and-local-only"`, `selected_companions`,
   `prior_run_paths`, `shared_file_owners`, `run_status: "in_progress"`.
2. Delegate threat-model generation to `$threat-model`. The skill already writes
   `<context_dir>/threat_model.md` and respects repository-scoped threat models
   authored earlier. Do not regenerate when one already exists.
3. Dispatch reconnaissance `research` sub-agents in parallel (the harness equivalent is
   `general`-type sub-agents, or the `security-engineer` specialist when depth warrants
   it). Each returns only structured source facts with `path:line` references; they do
   not write files.
4. Synthesize `<context_dir>/architecture.md`: product, stack, principals and authority
   controls, entry surfaces with propagation and sinks, local execution and deployment
   visibility, prior evidence, and sandbox-capability assessment.

If the strict pre-reconnaissance budget gate below fails, record `run_status:
"incomplete"` with `incomplete_reason: "budget_cannot_fund_reconnaissance_and_reserves"`
and launch no agents.

### Phase 2 — Coverage-led hunting

Goal: assign isolated hunters to coverage units, collect structured candidate results.

1. Delegate to `$finding-discovery`, passing the threat model from Phase 1 and the
   architecture map as context. Use `<discovery_dir>` as the discovery working area.
2. Build the deterministic coverage plan and write
   `<coverage_dir>/coverage_ledger.json`. Seed every in-scope surface × boundary ×
   attack-class unit as `planned`. Use `_shared/attack-classes/` as the reference
   catalog of vulnerability classes — hunters read class-specific guidance from there.
3. Assign units in priority order (lowest-trust entry first, highest-value resource
   first, then prior-run gaps and changed-source units; ties break lexicographically by
   `coverage_id`).
4. Each hunter writes only to its own `<scan_dir>/agents/<agent-id>/scratch/`. Hunters
   never read siblings' scratch, never write retained artifacts, never edit target
   source. The orchestrator merges hunter outputs into `<findings_dir>/raw_candidates.jsonl`
   per `_shared/scan-artifacts.md`.
5. After every wave, dispatch a coverage critic on the ledger. Critics may only update
   the ledger, not source or retained artifacts.
6. Resolve carried-carried-forward confirmed records from `prior_runs`: if the relevant
   source and conditions are unchanged and the record meets the current contract, link
   it to a current `planned` unit, exclude only its root cause from hunters, and route
   it through Phase 3 again. Do not treat prior `confirmed` records as ground truth.

If the budget cannot fund a wave's critic and validation reserve, mark that wave's
planned units `deferred` with `reason: "budget_cannot_reserve_critics_and_validation"`
and disclose in the report.

### Phase 3 — Candidate validation

Goal: give every unique candidate fingerprint to a fresh source verifier that tries to
disprove it.

1. For external findings (Linear issues, GitHub advisories, SARIF results, bug bounty
   reports), delegate to `$triage-finding`. Its output lands in
   `<scan_dir>/triage_result.json` (verdicts `confirmed | not_actionable | needs_review`).
2. For internal candidates from Phase 2, dispatch a fresh sub-agent per fingerprint.
   Each verifier writes only to its own `<scan_dir>/agents/<agent-id>/scratch/` and
   writes its verdict to `<findings_dir>/<candidate_id>/validation_report.md`.
   Verifiers never read hunter scratch or siblings' work.
3. If a candidate is rejected, record it under `rejected` in `findings.json` only after
   independent refutation. If validation is blocked on a source-grounded boundary fact
   that requires deployment, runtime, provider, or identity info not in the repo, record
   it under `needs_validation` with the exact missing fact and a safe validation plan.

### Phase 4 — Structured output

Goal: write the canonical findings artifact and validate it.

1. Write all final `confirmed`, `needs_validation`, and `rejected` records to
   `<findings_dir>/findings.json`. The file must conform to the schema at
   `_shared/validators/report-schema.json`.
2. Validate it:

   ```bash
   node skills/security/_shared/validators/validate-findings.cjs \
       <findings_dir>/findings.json
   ```

   Exit non-zero → fix schema violations, do not proceed to Phase 5.
3. Validate the coverage claim:

   ```bash
   node skills/security/_shared/validators/validate-coverage-ledger.cjs \
       <coverage_dir>/coverage_ledger.json
   ```

   Exit non-zero → fix ledger violations, do not proceed to Phase 5.
4. Update `run-metadata.json` only when the facts it carries change. Candidate state
   belongs in the coverage ledger and `findings.json`, not in metadata.

### Phase 5 — Independent record verification

Goal: a fresh agent verifies the final source claims for every `confirmed` record.

1. For each `confirmed` record in `findings.json`, dispatch a fresh verifier
   (`security-engineer` specialist when available, otherwise a `general`-type
   sub-agent). The verifier must be a different agent from the one that produced
   the Phase 3 validation report for the same record.
2. The verifier re-reads the `trace`, `evidence`, and `execution.observed_result` and
   confirms or refutes against current source. Material changes to a finding require
   another independent verifier pass.
3. After every replacement, re-run the Phase 4 validators:

   ```bash
   node skills/security/_shared/validators/validate-findings.cjs \
       <findings_dir>/findings.json
   ```

4. If a record's source has materially changed since Phase 3, the record must be
   re-routed through Phase 3 with a fresh verifier, not silently carried forward.

### Phase 6 — Target-neutral reporting

Goal: derive three markdown artifacts from the validated records. **Never write prose
findings before Phase 5 completes.**

1. `REPORT.md` — repository overview, profile, scope, run_status, coverage statement,
   per-finding status counts, and any incomplete reason. First section states explicitly
   when candidate validation is incomplete.
2. `FINDINGS-DETAIL.md` — every `confirmed` record in full: trace, evidence, conditions,
   execution, remediation, severity, confidence.
3. `NEEDS-VALIDATION.md` — every `needs_validation` record with the exact unresolved
   fact and a safe local or owner-observed validation plan. No live-probe instructions.

All three are derived from `<findings_dir>/findings.json` and
`<coverage_dir>/coverage_ledger.json`. The orchestrator writes both JSON and markdown
projection itself; there is no separate finalization script in this harness.

## Universal execution safety

These rules apply in both operating modes. Source inspection is read-only. Run
target-controlled builds, tests, processes, browsers, emulators, fuzzers, and fixture
processing only inside an OS-enforced sandbox that provides all of these controls:

- No external network; isolated loopback namespace only when the check needs local
  client/server traffic.
- Empty environment populated from an explicit allowlist with safe values, with
  scratch-local `HOME`, temporary directories, and caches.
- Read-only target and toolchain; target-controlled process may write only inside its
  assigned `scratch/` directory.
- Explicit low CPU, memory, process, file-size, disk, and wall-clock limits.

Use dummy principals, fixtures, and secrets. Do not probe deployed endpoints, external
services, shared infrastructure, production identities, other users' data, or live
control planes. Do not test availability against a live or shared process, publish
artifacts, alter releases, spend paid API quota, or continue beyond the minimum local
effect needed to establish a defect.

If every sandbox control cannot be enforced, do not execute target code: report the
missing sandbox capability as a needs-validation blocker and give a safe validation plan.

The orchestrator may make a disposable source copy in an assigned `scratch/` directory
when a build must write beside source. Only trusted parent-side code may promote the
minimum non-secret result to retained `artifacts/`. Never expose a retained output
directory (other than the agent's own assigned `scratch/`) or another agent's directory
to target code. Do not install dependencies or let builds fetch them. Use only tools
and dependencies already available locally.

## Run profiles and scope

Pick a profile from the user's request or propose one from the target's size and stakes.
Record it in `run-metadata.json` (`profile`, `scope_paths`) and state it in the report.

- **`quick`** — bounded pass for small targets, re-runs, or a fast first look. Coarsen
  ledger units to surface × boundary × attack class, run exactly one hunter wave plus
  exactly one final coverage-critic pass, and use one fresh verifier per candidate for
  both Phase 3 and Phase 5. Do not launch follow-up hunter waves; record the critic's
  accepted discoveries and reassignments as `deferred`.
- **`standard`** — the workflow as written.
- **`deep`** — for high-stakes or large targets. Split ledger units per subsystem and
  lifecycle mode, run critic waves to a clean pass, keep Phase 3 and Phase 5 as separate
  fresh agents, and give `prior_covered_same_source` units an independent second pass.

A **scoped run** audits a subset: named paths, one subsystem, one companion domain, or
the diff between two source refs. Seed ledger units only for in-scope surfaces and
record everything else as `out_of_scope` — never as `covered`. A scoped or `quick` run
must present itself as partial coverage.

Profiles change breadth and redundancy, never the evidence bar. Do not scale away the
candidate gate, the source/local execution boundary, `needs_validation` discipline,
schema validation, or independent verification of `confirmed` records.

### Cost budget

One unit is roughly one hunter assignment; one surviving candidate is one or two
verifier assignments depending on profile. When the user sets a budget — or the
orchestrator proposes one for a large target — record `budget` in `run-metadata.json`
as a maximum agent-invocation count across all phases.

Apply the strict budget gate before launching any reconnaissance agent. Reserve the
four baseline reconnaissance calls, one final post-wave critic for `quick` or one
post-wave plus one distinct final-clean critic for `standard`/`deep`, and at least one
verifier call. If the requested budget cannot fund that minimum, launch no agent: ask
for a larger budget, narrower scope, or different profile. If the request remains
unchanged, set `run_status: "incomplete"` with
`incomplete_reason: "budget_cannot_fund_reconnaissance_and_reserves"` and report that
no audit pass ran.

A strict total-agent budget can still be exceeded by an unexpectedly large candidate set
or by a material Phase 5 replacement that needs another independent verifier. If the
remaining budget cannot validate every candidate, stop hunting, validate candidates in
fingerprint order while the budget permits, and set `run_status: "incomplete"` plus
`incomplete_reason: "validation_budget_exhausted"`. Keep each unvalidated fingerprint
linked to a `candidate` ledger unit with that unresolved reason. Do not put an
unvalidated candidate in `findings.json`, relabel it `needs_validation`, or report the
run as complete. Phase 6 may produce a partial report only if its first section states
that candidate validation is incomplete and lists the affected fingerprints and units.

Never exceed a user-set strict budget silently.

## Core principles

### Require a boundary and result

For every candidate, name the lower-trust principal, accepted input or action,
intended control, crossed boundary, affected principal or resource, and concrete
observed or owner-observable result. Do not elevate a missing best practice, guessed
deployment behavior, generic parser crash, or self-impact into a security finding.

### Use bounded local evidence

Static analysis establishes the source path. Sandboxed local tests resolve behavior
when all execution controls are available: a minimal function harness, existing unit
test, small parser fixture, dummy-tenant integration test, locally rendered
configuration, or bounded isolated-loopback client. Stop at a wrong return value,
unauthorized dummy record, sanitizer finding, policy difference, or other minimum
effect. Do not extend the local check beyond the minimum boundary result or produce
persistence, post-fault, or concealment material.

### Respect source visibility

Deployment controls, proxy behavior, provider settings, browser headers, identity
policy, broker ACLs, packaging, and topology are real controls. If they are required
and absent from the repository, do not assume either presence or absence. Use
`needs_validation` with the exact missing fact and a safe owner-observed or local plan.

### Separate priority from certainty

Only `confirmed` records receive severity. Likelihood and impact must reflect the
demonstrated conditions and result; overall severity cannot exceed demonstrated impact.
`needs_validation` means a specific source-grounded boundary hypothesis is blocked,
not a low-confidence confirmed vulnerability, and it has no severity.

Calibrate overall severity with these anchors:

- **critical** — an unauthenticated actor gains code execution, full data-store access,
  or takeover of arbitrary accounts.
- **high** — an actor fully defeats an explicit security control with real consequences:
  authentication bypass, cross-tenant read or write, stored script execution affecting
  other users, authenticated code execution, or an unauthenticated remote stop of a
  shared service.
- **medium** — a real boundary violation with limited blast radius, uncommon
  preconditions, or consequences confined to a narrow resource set.
- **low** — disclosure of non-secret internals, or an effect requiring sustained
  effort for minimal gain.
- **informational** — a confirmed but minimal-impact observation, useful mainly as a
  prerequisite inside a larger finding.

The high/medium discriminator: does the demonstrated result fully defeat an explicit
control for an action with real consequences, or only weaken it? If you cannot state
the concrete damage, the severity is lower than it feels.

### Recommend the smallest effective source fix

For each confirmed finding, identify the invariant the code must enforce and the
narrowest source change that enforces it at the last trusted decision point. Prefer
specific repository-relative changes and regression tests over generic hardening
advice. The audit describes fixes; it does not modify target source.

## Anti-patterns

1. Checklist deviations presented as vulnerabilities.
2. Defense-in-depth advice with no reachable boundary violation.
3. Live or shared-environment testing where bounded local evidence is insufficient.
4. Guessing provider, proxy, browser, identity, or deployment behavior not present in
   source.
5. Treating intended same-principal authority or self-impact as a cross-boundary
   result.
6. Reporting a parser or runtime effect stronger than the observed effect.
7. Emitting prose-only hunter results that cannot be deduplicated or verified.
8. Re-reporting carried same-source prior confirmed records or using them as
   exemplars that anchor the hunt.
9. Assigning severity to `needs_validation` records.
10. Writing the report before independent verification or letting prose and JSON
    disagree.

## Output Contract

After Phase 6 completes, return:

- `run_status` — one of `complete`, `incomplete`.
- `incomplete_reason` — set only when `run_status: "incomplete"`.
- `findings_path` — absolute path to `<findings_dir>/findings.json`.
- `report_path` — absolute path to `<scan_dir>/REPORT.md`.
- `findings_detail_path` — absolute path to `<scan_dir>/FINDINGS-DETAIL.md`.
- `needs_validation_path` — absolute path to `<scan_dir>/NEEDS-VALIDATION.md`.
- `coverage_ledger_path` — absolute path to `<coverage_dir>/coverage_ledger.json`.
- `run_metadata_path` — absolute path to `<scan_dir>/run-metadata.json`.
- `validator_results` — exit codes and stderr summaries from both validators in
  Phase 4 and Phase 5.
- `counts` — number of `confirmed`, `needs_validation`, `rejected` records.
- `next_recommended` — when `run_status: "incomplete"`, the recommended follow-up
  (larger budget, narrower scope, different profile).

## Hard Rules

Read `_shared/shared-hard-rules.md` first. In addition:

- Never run validators on un-mutated data without first writing the JSON file the
  orchestrator owns.
- Never invent attack chains the code does not support. If the chain has gaps,
  document them as `proof_gaps` and treat the finding as `needs_validation`.
- Never widen scope into unrelated cleanup or refactors.
- Never modify target source. The audit describes them; `fix-finding` (when explicitly
  invoked) writes them.
- A provided threat model or authoritative security guidance is authoritative. Do not
  edit, expand, or reinterpret it.