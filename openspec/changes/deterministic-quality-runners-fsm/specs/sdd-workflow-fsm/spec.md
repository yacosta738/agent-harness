# SDD Workflow FSM Specification

## Purpose

Define legal, resumable SDD phase transitions and safe state persistence without making prompt text authoritative.

## Requirements

### Requirement: Enforce the SDD state graph

The FSM MUST recognize `init`, `explore`, `propose`, `spec`, `design`, `tasks`, `apply`, `verify`, `qa`, and `archive`. It SHALL allow `init → explore → propose`, `propose → spec` and `propose → design`, completion of both `spec` and `design` before `tasks`, then `tasks → apply → verify → qa → archive`. It MUST reject every other transition.

#### Scenario: Parallel specification and design

- GIVEN a change is at `propose`
- WHEN spec and design are completed independently
- THEN the FSM accepts both completion records
- AND permits `tasks` only after both required artifacts are present

#### Scenario: Illegal transition

- GIVEN a change is at `verify`
- WHEN a caller requests `archive` without completing QA
- THEN the FSM rejects the transition with a reason
- AND it does not change state or claim completion

### Requirement: Enforce phase preconditions and gates

Each transition MUST validate required predecessor artifacts and configured policy. `verify` MUST have a technical conformance report; `qa` MUST have a valid acceptance report; `archive` MUST require both reports, their allowed verdicts, and no unresolved blocking findings or acceptance-relevant `BLOCKED`/`NOT TESTED`, unless an explicitly permitted non-runtime exception is recorded. Missing or invalid evidence MUST block the transition.

#### Scenario: Archive without valid QA

- GIVEN `verify-report.md` exists but `qa-report.md` is absent, malformed, or has a blocking verdict
- WHEN archive is requested
- THEN the FSM rejects the request
- AND it preserves the original evidence and reports

#### Scenario: Valid gate sequence

- GIVEN required artifacts and policy checks pass in order
- WHEN verify, QA, and archive transitions are requested
- THEN each transition is accepted only after its gate passes
- AND the resulting state identifies the completed phase

### Requirement: Preserve legacy state and provide idempotent transitions

The FSM MUST read and preserve the legacy `current_phase`, `completed`, `next`, and `updated` fields. Additional metadata MAY be additive. Repeating a transition with the same state, inputs, and evidence MUST be a no-op with the same outcome; a legacy file containing only the four fields MUST remain resumable when internally consistent.

#### Scenario: Legacy resume

- GIVEN a valid state file containing only the four legacy fields
- WHEN continuation loads the change
- THEN it derives the legal next phase without requiring new metadata
- AND it does not rewrite or discard the legacy fields

#### Scenario: Repeated transition

- GIVEN a legal transition has already been committed
- WHEN the same transition is submitted again with identical inputs
- THEN the FSM returns the existing outcome
- AND it does not duplicate artifacts or advance another phase

### Requirement: Make state updates atomic and conflict-safe

State persistence MUST be atomic: readers SHALL observe either the prior complete state or the next complete state. Concurrent conflicting updates MUST NOT silently overwrite one another; one request MUST be rejected as stale or conflicting and the durable state MUST remain valid. Parse, permission, or write errors MUST leave the last valid state and evidence intact.

#### Scenario: Concurrent phase requests

- GIVEN two sessions submit different legal transitions from the same state
- WHEN both attempt to commit
- THEN at most one transition is accepted
- AND the rejected session receives a conflict reason without erasing the accepted state

#### Scenario: State write failure

- GIVEN a transition passes validation but persistence fails
- WHEN the FSM reports the failure
- THEN the prior state remains readable and unchanged
- AND no success transition is reported
