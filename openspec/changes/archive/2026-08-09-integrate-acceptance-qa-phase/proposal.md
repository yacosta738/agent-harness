# Proposal: Integrate Acceptance QA Phase

## Intent

### Problem
Technical verification is not a user-facing acceptance gate. The current pipeline can archive without product evidence or visibility into missing capabilities.

### Goal
Add capability-driven acceptance, release gates, and resumable state.

## Scope

### In Scope
- Add `sdd-qa`, command/prompt/skill contracts, and `qa-report.md`.
- Change the DAG to `apply → verify → qa → archive`; update state/continuation.
- Require both reports before archive, with severity policy.
- Compose available QA skills; document smoke limits.

### Out of Scope
- A universal test runner or application-under-test for this repository.
- Moving acceptance into `sdd-verify` or forcing browser automation for every change.
- Product-specific scenarios without a target project.

## Capabilities

### New Capabilities
- `acceptance-qa`: Select capabilities, run observable scenarios, and persist evidence/verdicts.
- `sdd-lifecycle`: Model QA dependencies, continuation, and archive gates.

### Modified Capabilities
- None; `openspec/specs/` has no relevant main specs.

## Approach and Boundaries

`verify` owns requirement/spec/design/task conformance and technical runtime evidence. `qa` owns user/operator behavior and records target, environment, capability, scenarios, evidence, untested paths, findings, and verdict: `PASS`, `PASS WITH WARNINGS`, `FAIL`, `BLOCKED`, or `NOT TESTED`. QA MUST NOT fix code; static inspection MUST NOT yield `PASS`. `apply` supplies handoff context only. `archive` validates both reports, merges deltas, and preserves evidence.

Archive MUST block missing reports, `FAIL`, or unresolved `CRITICAL`/P0/P1 findings. Acceptance-relevant `BLOCKED`/`NOT TESTED` normally blocks release; documentation/config-only changes MAY proceed with explicit rationale and warning. P2/P3 findings are warnings unless policy says otherwise.

## Artifacts, Migration, and State

Artifacts: `verify-report.md`, `qa-report.md`, delta specs, and dated archive contents. `state.yaml`/`sdd-continue` MUST recognize `qa`, require `qa-report.md`, and never select archive early. Existing changes without QA reports continue at QA or require a visible exception.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `opencode.json` | Modified | Register `sdd-qa`. |
| `README.md`, `AGENTS.md`, `commands/sdd-continue.md` | Modified | DAG, gates, recovery. |
| `prompts/sdd/*`, `skills/sdd/_shared/*` | Modified | Contracts and artifact paths. |
| `skills/sdd/sdd-qa/` | New | QA execution/report contract. |
| `openspec/config.yaml` | Modified | Verdict, severity, archive rules. |

## Risks and Rollback

Capability drift and archive deadlock are mitigated by runtime resolution, explicit `BLOCKED`/`NOT TESTED`, and policy exceptions. Roll back by reverting contract/config/documentation changes; retain reports. No data migration is required.

## Decisions Requiring User Approval

1. QA for every change or only acceptance-relevant changes (recommended: latter with exceptions).
2. Archive policy for `BLOCKED`/`NOT TESTED` non-runtime changes (recommended: warning with rationale).
3. Final verdict/severity vocabulary and P2/P3 release treatment.
4. Executable state enforcement now, or documented orchestrator contract first.

## Success Criteria

- [ ] `sdd-qa` is registered and the DAG is `apply → verify → qa → archive`.
- [ ] QA produces evidence and never fabricates success.
- [ ] Archive rejects missing reports and release-blocking findings.
- [ ] Continuation safely resumes at QA and supports in-flight changes.
