# Delta for Acceptance QA

## ADDED Requirements

### Requirement: Consume runner evidence without changing authority

`verify` and `qa` MUST consume available runner envelopes and preserve their statuses, reasons, and evidence. Agents MAY explain or summarize results, but MUST NOT invent commands, alter exit or parser outcomes, or convert `FAIL`, `UNAVAILABLE`, `BLOCKED`, or `NOT_TESTED` into a passing result.

#### Scenario: Runner failure

- GIVEN a configured capability produces `FAIL` evidence
- WHEN verify or QA records the result
- THEN the report retains `FAIL`, its reason, and evidence
- AND prose MUST NOT produce `PASS` or `PASS WITH WARNINGS`

#### Scenario: Missing or unavailable capability

- GIVEN a requested capability is not configured or its command is unavailable
- WHEN verify or QA evaluates the scope
- THEN it records the unavailable or untested limitation
- AND static inspection or agent interpretation MUST NOT produce `PASS`

#### Scenario: Prompt-driven fallback

- GIVEN the runner or FSM is disabled or unavailable
- WHEN the existing prompt-driven flow continues
- THEN the report visibly marks `fallback` and its limitation
- AND it MUST NOT claim deterministic enforcement

## MODIFIED Requirements

### Requirement: Use controlled results and evidence

Each scenario MUST have `PASS`, `FAIL`, `BLOCKED`, or `NOT TESTED`, plus evidence or a reason. Runner envelopes MAY also carry `UNAVAILABLE`; QA MUST preserve that input and record `NOT TESTED` for absence or unavailability, or `BLOCKED` for an external execution constraint, never `PASS`. The report verdict MUST be `PASS`, `PASS WITH WARNINGS`, `FAIL`, `BLOCKED`, or `NOT TESTED`. Findings MUST use `CRITICAL`, `P0`, `P1`, `P2`, or `P3`.

(Previously: QA used controlled scenario and report statuses but did not define how normalized runner evidence mapped into them.)

#### Scenario: No fabricated pass

- GIVEN an attempted path is prevented by target, credentials, environment, or another external constraint
- WHEN QA records it
- THEN it records `BLOCKED` with constraint evidence
- AND MUST NOT record `PASS` or `PASS WITH WARNINGS`

### Requirement: Persist a complete QA report

QA MUST persist `qa-report.md` containing identity, source artifacts, target/environment, capabilities, scenarios, evidence, untested scope, findings/severity, verdict, rationale, and limitations. When runner evidence exists, the report MUST retain its identity, status, reason, and artifact reference; when fallback is used, it MUST identify that mode and limitation.

(Previously: The report contract listed QA evidence and limitations but did not require runner-envelope identity or visible fallback.)

#### Scenario: Auditable completion

- GIVEN QA finishes or cannot proceed
- WHEN the phase returns
- THEN the report exists at the change root and supports assessment of every claimed result
- AND runner or fallback limitations are visible
