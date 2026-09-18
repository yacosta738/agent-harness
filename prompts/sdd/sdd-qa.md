---
name: sdd-qa
description: "Acceptance QA phase prompt for capability-driven observable behavior checks."
disable-model-invocation: true
user-invocable: false
license: MIT
metadata:
  author: acosta
  version: "1.0"
  delegate_only: true
---

> **ORCHESTRATOR GATE**: If you loaded this prompt through `skill()`, stop and delegate to the
> dedicated `sdd-qa` executor. Executors continue below without delegation.

## Activation

Run in the lifecycle `apply → verify → qa → archive`, after `sdd-verify` and before `sdd-archive`. QA is an independent acceptance gate, not a second technical verification pass. It evaluates observable user/operator behavior from proposal capabilities, specifications, design, and target surface.

## Inputs

Read `proposal.md`, every delta spec, `design.md`, `tasks.md`, `verify-report.md` when present, `state.yaml`, and `openspec/config.yaml`. Resolve the target from the orchestrator and repository context. If no target is supplied, do not invent one.

## Capability and scenario contract

Discover available browser, API, data, accessibility, responsive, locale, persistence, exploratory, manual, or equivalent capabilities. Record capabilities as available/selected/rejected/unavailable with rationale. Select only capabilities that can produce observable evidence. Attempt applicable happy-path, negative, boundary, repeated/interrupted, unauthorized/security, state-transition, browser, accessibility, responsive, internationalization, persistence, and exploratory scenarios; record a non-applicability reason where a category does not apply.

Every scenario MUST be `PASS`, `FAIL`, `BLOCKED`, or `NOT TESTED` and include evidence or a reason. A target, credentials, permissions, or environment constraint produces `BLOCKED`; no target or executable capability produces `NOT TESTED`. Static inspection MUST NOT produce `PASS` or `PASS WITH WARNINGS`. QA MUST NOT modify source code or fix findings.

When runner envelopes exist, preserve their `status`, `reason`, and evidence reference. Map runner `UNAVAILABLE`
to QA `NOT TESTED`, external execution prevention to `BLOCKED`, and runner `FAIL` to `FAIL`; prose cannot override
those results. If the runner/FSM is unavailable, visibly record `fallback` and its limitation.

## Required report

Write `openspec/changes/{change-name}/qa-report.md` with:

1. identity (change, mode, phase, date)
2. source artifacts and technical verification handoff
3. target, environment, permissions, and limitations
4. capability inventory with selected/rejected reasons
5. scenario matrix with result and evidence/reason
6. untested scope, reason, and rerun prerequisite
7. findings with `CRITICAL`, `P0`, `P1`, `P2`, or `P3` severity and status
8. final verdict: `PASS`, `PASS WITH WARNINGS`, `FAIL`, `BLOCKED`, or `NOT TESTED`
9. verdict rationale and implementation handoff

Use the report as the audit record, not as a claim that the harness itself has product acceptance. For this repository, which has no application under test or general test runner, document the limitation and use `NOT TESTED` or `BLOCKED` rather than a fabricated pass.

## Archive gate

Archive MUST see both `verify-report.md` and `qa-report.md`. It blocks missing reports, `FAIL`, unresolved `CRITICAL`/P0/P1 findings, and normally acceptance-relevant `BLOCKED`/`NOT TESTED`. Documentation/config-only changes MAY proceed with explicit rationale and a visible warning without changing the QA verdict. P2/P3 findings are warnings unless config policy says otherwise.

## Return

Return the Section D envelope with `status`, `executive_summary`, `detailed_report`, `artifacts`, `next_recommended`, `risks`, and `skill_resolution`. Do not claim product acceptance for the harness.
