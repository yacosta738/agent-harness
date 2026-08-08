---
name: sdd-qa
description: "Run capability-driven acceptance QA and persist an auditable QA report."
disable-model-invocation: true
user-invocable: false
license: MIT
metadata:
  author: acosta
  version: "1.0"
  delegate_only: true
---

> **ORCHESTRATOR GATE**: If you loaded this skill via the `skill()` tool, you are the
> ORCHESTRATOR — STOP. Do NOT execute these instructions inline. Delegate to the dedicated
> `sdd-qa` sub-agent. This skill is for EXECUTORS only.

## Executor Override

If you ARE the `sdd-qa` sub-agent, continue with the phase work below. Do NOT delegate, call task/delegate, modify code, or fix findings. You own acceptance evidence and the QA report only.

## Purpose

The lifecycle is `apply → verify → qa → archive`. Evaluate observable user/operator behavior after technical verification. `sdd-verify` owns requirements, design, task, and available technical-runtime conformance; `sdd-qa` owns acceptance behavior and returns findings for implementation. QA MUST NOT repair code or silently change artifacts outside its report and phase state handoff.

## Required Inputs

Read the active change artifacts before testing:

- `openspec/changes/{change-name}/proposal.md`
- `openspec/changes/{change-name}/specs/` (all domains)
- `openspec/changes/{change-name}/design.md`
- `openspec/changes/{change-name}/tasks.md`
- `openspec/changes/{change-name}/verify-report.md` when present
- `openspec/changes/{change-name}/state.yaml`
- `openspec/config.yaml`

Use the proposal capabilities, specifications, design, and target surface as sources of truth. Code inspection can identify the target and inform scenarios, but code MUST NOT be the sole source of acceptance criteria.

## Capability Resolution

Inspect the target and available tools at runtime. Consider, as applicable:

- browser or Playwright/Chrome DevTools
- API/client requests
- data or persistence checks
- accessibility or responsive checks
- locale/internationalization checks
- manual or exploratory checks
- project-specific acceptance capabilities supplied by the orchestrator

Record every relevant capability as `available`, `selected`, `rejected`, or `unavailable`, including the reason. Select the narrowest capability that can produce observable evidence. Do not require browser automation for a non-browser target and do not invent an application-under-test.

If there is no suitable target or executable capability, the final verdict MUST be `NOT TESTED`. Static inspection alone MUST NOT produce `PASS` or `PASS WITH WARNINGS`. If a suitable path is prevented by credentials, environment, permissions, or another external constraint, record the scenario as `BLOCKED` with constraint evidence.

## Coverage Rules

For each applicable acceptance risk, consider and record the result or non-applicability rationale for:

- happy path and user/operator outcome
- negative and boundary input
- repeated, interrupted, or state-transition behavior
- unauthorized or security-sensitive behavior
- browser, responsive, accessibility, locale, persistence, and exploratory behavior when relevant

Every scenario has exactly one result: `PASS`, `FAIL`, `BLOCKED`, or `NOT TESTED`, plus evidence or a reason. Do not duplicate technical conformance checks already owned by `verify`.

## Canonical `qa-report.md`

Persist `openspec/changes/{change-name}/qa-report.md` before returning. Use this structure and keep the evidence auditable:

```markdown
# Acceptance QA Report: {change-name}

## Identity
- Change:
- Mode: openspec
- QA phase:
- Date:

## Sources of Truth
- Proposal:
- Specifications:
- Design:
- Tasks:
- Technical verification:

## Target and Environment
- Target:
- Environment:
- Credentials/permissions:
- Limitations:

## Capability Inventory
| Capability | Availability | Selected? | Rationale / rejection reason |
|---|---|---|---|

## Scenario Matrix
| ID | Capability | Acceptance scenario | Result | Evidence or reason |
|---|---|---|---|---|

Allowed results: `PASS`, `FAIL`, `BLOCKED`, `NOT TESTED`.

## Untested Scope
- Scope:
- Reason:
- Re-run prerequisite:

## Findings
| ID | Severity | Scenario / location | Evidence | Status |
|---|---|---|---|---|

Allowed severities: `CRITICAL`, `P0`, `P1`, `P2`, `P3`.

## Verdict
`PASS` | `PASS WITH WARNINGS` | `FAIL` | `BLOCKED` | `NOT TESTED`

### Rationale

## Limitations and Handoff
- QA does not fix code.
- Product acceptance is not claimed without a target and observable evidence.
- Follow-up for implementation:
```

A report is incomplete if it omits target/environment, capability decisions, scenarios, evidence or reasons, untested scope, findings/severity, verdict rationale, or limitations.

## Verdict and Archive Handoff

Use `PASS` only when applicable acceptance scenarios have observable evidence. Use `PASS WITH WARNINGS` only when accepted scenarios pass and remaining findings are non-blocking warnings. Use `FAIL` for observed behavior failures. Use `BLOCKED` for externally prevented testing. Use `NOT TESTED` when no applicable executable target/capability exists.

Archive requires both `verify-report.md` and `qa-report.md`, rejects missing reports, failed reports, unresolved `CRITICAL`/P0/P1 findings, and normally rejects acceptance-relevant `BLOCKED`/`NOT TESTED`. Documentation/config-only changes may proceed only with an explicit rationale and visible warning; that exception does not change the QA verdict.

## Return Envelope

Return text containing:

- `status`: `success`, `partial`, or `blocked`
- `executive_summary`: 1–3 sentences
- `detailed_report`: report verdict and evidence summary
- `artifacts`: the persisted `qa-report.md`
- `next_recommended`: `sdd-archive` only when the report is complete and policy allows; otherwise the remediation or rerun phase
- `risks`: release risks and limitations
- `skill_resolution`: how skills were loaded
