# Acceptance QA Report: deterministic-quality-runners-fsm

## Identity

- **Change**: `deterministic-quality-runners-fsm`
- **Mode**: `openspec`
- **QA phase**: `qa`
- **Date**: 2026-08-09
- **Verdict**: `BLOCKED`
- **Boundary**: This report evaluates observable behavior of the repository-local harness CLI and its configured fixtures. It does not claim acceptance of a product or deployed operator surface.

## Sources of Truth and Technical Verification Handoff

- **Proposal**: `openspec/changes/deterministic-quality-runners-fsm/proposal.md`
- **Delta specifications**:
  - `openspec/changes/deterministic-quality-runners-fsm/specs/quality-runners/spec.md`
  - `openspec/changes/deterministic-quality-runners-fsm/specs/sdd-workflow-fsm/spec.md`
  - `openspec/changes/deterministic-quality-runners-fsm/specs/acceptance-qa/spec.md`
- **Design**: `openspec/changes/deterministic-quality-runners-fsm/design.md`
- **Tasks**: `openspec/changes/deterministic-quality-runners-fsm/tasks.md`
- **Apply handoff**: `openspec/changes/deterministic-quality-runners-fsm/apply-progress.md`
- **Technical verification**: `openspec/changes/deterministic-quality-runners-fsm/verify-report.md`
- **Repository policy**: `openspec/config.yaml`
- **Operator documentation**: `README.md`, `commands/sdd-continue.md`, SDD verify/QA prompts and skills
- **Relevant executable surfaces**: `scripts/sdd-quality-runner.mjs`, `scripts/sdd-fsm.mjs`, `scripts/sdd-*-smoke.sh`, `scripts/fixtures/`

`verify-report.md` hands off technical conformance as `PASS WITH WARNINGS`; it explicitly does not claim product/operator acceptance. QA preserves that boundary. The repository has no general test runner and no final application under test.

## Target and Environment

- **Target**: Repository-local standalone quality-runner/FSM commands operating on the supplied Node, Python, runner, and temporary FSM fixtures. No separate product target or deployed operator target was supplied.
- **Environment**: `/Users/acosta/Dev/agent-harness`, macOS Darwin arm64, Node `v24.16.0`, Bash, and `python3`; smoke scripts were executed from the current checkout.
- **Credentials/permissions**: No credentials were required for local fixtures. External distribution inspection was read-only. Dotter was not executed and no global configuration was changed, per authorization constraint.
- **Limitations**:
  - The root manifest and FSM policy are intentionally disabled, so direct root execution is compatibility `NOT TESTED`/`fallback`, not deterministic enforcement.
  - There is no product UI, API, deployed service, or independent verify/QA report generator to exercise end-to-end acceptance.
  - The dotfiles submodule pointer and effective `~/.config/opencode` do not contain this change; rollout is outside this checkout and was not modified.
  - Smoke scripts create ephemeral evidence and clean their fixture artifacts after completion; command output and observed classifications are recorded below.

## Capability Inventory

| Capability | Availability | Selected? | Rationale / rejection reason |
|---|---|---:|---|
| Repository-local process/CLI execution | available | yes | Narrow executable path for observable harness operator behavior. |
| Configured Node fixture capability | available | yes | Exercises explicit `argv` configuration and result identity. |
| Configured Python fixture capability | available | yes | Exercises a different stack without inference. |
| Runner negative/boundary fixtures | available | yes | Exercises unavailable executable, timeout, parser, threshold, redaction, environment isolation, and path safety. |
| FSM temporary-project persistence | available | yes | Exercises transitions, archive gates, legacy state, idempotency, locking, and atomic writes. |
| JSON/Markdown evidence inspection after execution | available | yes | Evidence was inspected only after commands ran; static source inspection was not promoted to PASS. |
| Browser / Playwright / Chrome | available | no | Rejected: the change exposes CLI/configuration, not a browser surface. |
| API/client or deployed service | unavailable | no | No service or external target exists in this repository. |
| Data-store/persistence integration | unavailable | no | No product data store; temporary filesystem state was selected instead. |
| Accessibility and responsive checks | unavailable | no | No UI target. |
| Locale/internationalization checks | unavailable | no | No locale-sensitive product surface or acceptance requirement. |
| Manual/exploratory CLI checks | available | yes | Direct invocations supplemented the smoke scripts for fallback, repeatability, and invalid archive behavior. |
| External checkout/submodule/effective-config inspection | available | yes, read-only | Used filesystem and Git metadata only; no Dotter run or modification. |
| Dotter materialization | available but not authorized | no | Deliberately rejected because the request forbids Dotter/global changes without authorization. |
| Static source/report inspection as acceptance evidence | available | no | Used for context and limitations only; it cannot produce PASS under QA policy. |
| General repository test runner | unavailable | no | `openspec/config.yaml` documents that none exists. |

## Scenario Matrix

`PASS` in this table means the local executable harness scenario produced the expected observable outcome. It is not a product-acceptance claim. Runner statuses embedded in evidence remain authoritative and are shown explicitly.

| ID | Capability | Acceptance scenario | Result | Evidence or reason |
|---|---|---|---|---|
| QA-RUN-01 | Node/Python fixture execution | An operator configures two different stacks and obtains the declared capability result without stack inference. | **PASS** | `node scripts/sdd-quality-runner.mjs run --project scripts/fixtures/node-project --capability test --json`: process `0`, runner `PASS/policy_satisfied`, capability `test`. Python fixture produced the same `PASS/policy_satisfied` result using its declared `python3` argv. |
| QA-RUN-02 | Repeatability | Identical normalized inputs produce the same status and reason on repeated runs. | **PASS** | Two `threshold` invocations both returned runner `FAIL/threshold_rejected`; `same_classification=true`. |
| QA-RUN-03 | Negative classification | A missing executable is not converted into a pass. | **PASS** | Runner fixture returned `UNAVAILABLE/executable_not_found`, process `0`; no `PASS`. |
| QA-RUN-04 | Timeout classification | A capability exceeding its timeout is not converted into a pass. | **PASS** | Runner fixture returned `BLOCKED/timeout`, process `1`; no `PASS`. |
| QA-RUN-05 | Parser/exit classification | Parser rejection and non-accepted execution are not converted into a pass. | **PASS** | Parser fixture returned `FAIL/parser_rejected`, process `1`; quality smoke also exercised rejected exit and threshold paths. |
| QA-RUN-06 | Security-sensitive runner behavior | Non-allowlisted environment values are not exposed and configured secrets do not persist. | **PASS** | Environment fixture returned `not-visible`. A diagnostic command returned runner `FAIL/exit_code_rejected`; JSON and Markdown evidence contained `[REDACTED]` and did not contain `qa-fixture-secret`. |
| QA-RUN-07 | Evidence auditability | An attempted result has inspectable JSON and Markdown evidence with identity, reason, status, and references. | **PASS** | Direct run produced `artifacts/runs/<run-id>/audit.json` and `audit.md`; both were read after execution and retained redacted status/reason/evidence. |
| QA-RUN-08 | Boundary/path safety | Unsafe capability identifiers do not escape the run directory or silently collide. | **PASS** | `bash scripts/sdd-quality-smoke.sh` passed the `evidence-path` and collision checks; this was runtime fixture evidence, not source inspection. |
| QA-FSM-01 | FSM state transition | Spec and design branches can both be completed before tasks. | **PASS** | `bash scripts/sdd-fsm-smoke.sh` accepted both branch transitions and the resulting tasks transition. |
| QA-FSM-02 | FSM negative/archive gate | An invalid archive request is rejected and does not claim completion. | **PASS** | Direct temporary-project request returned process `1`, `accepted=false`, `reason=archive_gate_failed`; `state.yaml` still contained `current_phase: qa` and `revision: 0`. |
| QA-FSM-03 | Legacy/resume persistence | A legacy four-field state remains resumable and its state remains valid after a legal transition. | **PASS** | `sdd-fsm-smoke.sh` loaded the four-field `propose/spec-design` fixture and accepted the branch flow; no legacy parsing failure occurred. |
| QA-FSM-04 | Idempotency/conflict behavior | Repeating the same request is idempotent, while stale/concurrent requests do not overwrite accepted state. | **PASS** | `sdd-fsm-smoke.sh` passed repeated-transition, stale-revision, concurrent-writer, stale-lock, and atomic-write checks. |
| QA-FSM-05 | Fallback visibility | Disabled root runner/FSM behavior is visible and cannot be mistaken for deterministic enforcement. | **PASS** | Root runner returned `result.status=NOT_TESTED`, `reason=runner_disabled`; root FSM returned `status=fallback`, `reason=fsm_disabled`, exit `3`. |
| QA-QA-01 | Verify/QA adapter authority | Verify and QA preserve runner status, reason, evidence identity, and cannot turn failure/unavailable/blocking outcomes into prose-driven PASS. | **NOT TESTED** | No executable verify/QA adapter or product/operator target exists. `verify-runner-fail.md` and `qa-fallback.md` are static fixtures; their text was not promoted to PASS. Requires an executable report-producing adapter or real target. |
| QA-QA-02 | Fallback/report acceptance | A real QA report records all scenario statuses and visible fallback limitations. | **NOT TESTED** | The repository has no general report-generation runtime. Contract fixture matching is technical evidence already covered by verify, not independent acceptance evidence. |
| QA-DIST-01 | Source checkout distribution | The current checkout can run the local harness smoke entry points. | **PASS** | `bash scripts/sdd-quality-smoke.sh`, `bash scripts/sdd-fsm-smoke.sh`, and `bash scripts/sdd-smoke.sh` all completed successfully from this checkout. |
| QA-DIST-02 | Dotfiles submodule distribution | The dotfiles submodule exposes the new scripts/config after rollout. | **BLOCKED** | Read-only inspection showed pointer `bec94894c08ff5b8db8119f6bcdec5bc9e76195d`, with `scripts/sdd-quality-runner.mjs` and `scripts/sdd-fsm.mjs` absent in `/Users/acosta/Dev/dotfiles/editors/agents/opencode`. Task `4.3` remains outside this checkout. |
| QA-DIST-03 | Effective `~/.config/opencode` distribution | The materialized effective configuration exposes the new scripts/config. | **BLOCKED** | Read-only inspection showed the new runner/FSM/scripts and `openspec/quality-runner.json` absent from `/Users/acosta/.config/opencode`; Dotter was not run by authorization constraint. |
| QA-TGT-01 | Product/operator acceptance boundary | The completed change is accepted on a real final product or deployed operator target. | **NOT TESTED** | No final application, external target, or supplied acceptance environment exists. Local fixtures establish only harness behavior and cannot substitute for product acceptance. |
| QA-WEB-01 | Browser/responsive/accessibility | Browser, responsive, and accessibility behavior is acceptable. | **NOT TESTED** | Not applicable: no browser/UI target exists. |
| QA-I18N-01 | Internationalization | Locale behavior is acceptable. | **NOT TESTED** | Not applicable: no locale-sensitive target exists. |
| QA-API-01 | API/authorization | API and unauthorized-user behavior is acceptable. | **NOT TESTED** | Not applicable: no API, identity, or authorization target exists. Secret isolation was covered separately by QA-RUN-06. |

## Untested Scope

| Scope | Reason | Re-run prerequisite |
|---|---|---|
| Verify/QA report-producing adapters and prose-authority boundary | Only static report fixtures and technical smoke assertions exist; no executable adapter path was supplied. | Provide or enable an executable verify/QA adapter and a target that emits/consumes runner envelopes. |
| Product/deployed operator acceptance | This repository is configuration/utilities only and no target was supplied. | Identify the final product/operator target, environment, and permissions. |
| Dotfiles submodule and effective `~/.config/opencode` rollout | Consumer pointer/materialization is stale; Dotter execution is not authorized in this phase. | Update the consumer pointer outside this change, materialize through the authorized rollout process, then rerun read-only distribution smoke. |
| Browser, accessibility, responsive, locale, API, and authorization behavior | No applicable surface exists. | Only rerun if a corresponding target is introduced. |
| Root deterministic mode | `openspec/config.yaml` intentionally sets runner/FSM `enabled: false`. | Enable explicitly for a controlled target and rerun without treating fallback as enforcement. |

## Findings

| ID | Severity | Scenario / location | Evidence | Status |
|---|---|---|---|---|
| QA-001 | **P1** | Distribution rollout, task `4.3` | New scripts/config are absent from the dotfiles submodule checkout and effective `/Users/acosta/.config/opencode`; only the source checkout was executable. | **Open — external rollout prerequisite** |
| QA-002 | **P1** | Acceptance target boundary | No final product, deployed operator target, or supplied acceptance environment exists; several acceptance scenarios are therefore `NOT TESTED`. | **Open — target required before acceptance can close** |
| QA-003 | **P2** | Verify/QA adapters | Status-preservation and prose non-overwrite behavior has no independent executable report-generation target; static fixtures cannot be a QA PASS. | **Open — rerun with executable adapter/target** |

No `CRITICAL` or `P0` finding was observed in the executable local harness scenarios. The P1 findings are acceptance blockers, not claims that the locally executed runner/FSM behavior failed.

## Verdict

**BLOCKED**

### Rationale

The repository-local CLI behavior was observable and consistent for the selected harness scenarios: two configured stacks passed deterministically, non-pass outcomes remained `UNAVAILABLE`, `BLOCKED`, or `FAIL`, evidence was redacted in both JSON and Markdown, FSM gates/idempotency/fallback were exercised, and the source checkout smoke path passed. However, QA cannot close acceptance because the change has no final product/deployed operator target, verify/QA authority preservation was not independently executable, and the required dotfiles/effective-configuration rollout is externally blocked. The `allow_non_runtime_exception` policy is not applied: this change includes executable scripts and distribution behavior, so it is not documentation/config-only.

## Limitations and Implementation Handoff

- QA did not modify source code, fixtures, dotfiles, Dotter state, global configuration, or consumer pointers.
- Static inspection was used only to resolve capabilities, targets, and limitations; it did not produce any PASS result.
- Local smoke PASS results are harness-observable evidence only and must not be reported as product acceptance.
- Keep `state.yaml` at `current_phase: qa` with `next: qa`; do not archive until the P1 acceptance blockers are resolved or a policy-allowed exception is explicitly established.
- Follow-up: provide the real acceptance target and authorized distribution rollout, then rerun this QA phase. Add an executable verify/QA adapter path if status-preservation behavior must be accepted end-to-end.
