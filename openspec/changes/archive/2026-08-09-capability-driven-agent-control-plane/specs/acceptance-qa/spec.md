# Delta for Acceptance QA

## ADDED Requirements

### Requirement: Integrate evidence without duplicating the runner or FSM

Slice 1 of the new control plane MUST consume the existing runner result states, redaction, artifact rules, locks, revision checks, and `state.yaml` guards. It MUST NOT create a second runner/FSM, change the prior `deterministic-quality-runners-fsm` change, or enable either feature flag by default. Durable handoffs, event logs, runtime plugins, and distribution rollout remain future contracts.

#### Scenario: Compatible technical handoff

- GIVEN the existing runner or phase FSM has produced a controlled result
- WHEN the new policy/evidence layer is enabled for this change
- THEN QA consumes that result and its identity envelope
- AND existing state, atomicity, and `PASS/FAIL/BLOCKED/UNAVAILABLE/NOT_TESTED` semantics remain intact

#### Scenario: Separate active changes

- GIVEN `deterministic-quality-runners-fsm` remains active or `BLOCKED` in QA
- WHEN this change is selected explicitly
- THEN no artifact or `state.yaml` in the prior change is modified
- AND continuation MUST NOT infer or merge the two changes

## MODIFIED Requirements

### Requirement: Use controlled results and evidence

Each scenario MUST have `PASS`, `FAIL`, `BLOCKED`, or `NOT TESTED`, plus evidence or a reason. Evidence MUST reference a valid identity-bound envelope and current impact/config/toolchain/artifact digests. The report verdict MUST be `PASS`, `PASS WITH WARNINGS`, `FAIL`, `BLOCKED`, or `NOT TESTED`. Findings MUST use `CRITICAL`, `P0`, `P1`, `P2`, or `P3`; stale, replayed, or agent-authored claims MUST NOT become a pass.

#### Scenario: No fabricated pass

- GIVEN an attempted path is prevented by target, credentials, environment, or stale/foreign evidence
- WHEN QA records it
- THEN it records `BLOCKED` or `NOT TESTED` with the constraint and identity evidence
- AND MUST NOT record `PASS` or `PASS WITH WARNINGS`

### Requirement: Persist a complete QA report

QA MUST persist `qa-report.md` containing identity, source artifacts, target/environment, capabilities, scenarios, evidence envelope references and freshness, untested scope, findings/severity, verdict, rationale, and limitations.

#### Scenario: Auditable completion

- GIVEN QA finishes or cannot proceed
- WHEN the phase returns
- THEN the report exists at the change root and supports assessment of every claimed result
- AND each claimed result can be tied to its change/task/run and artifact hashes

### Requirement: Enforce archive severity and exceptions

Archive MUST require both reports and reject missing reports, `FAIL`, or unresolved `CRITICAL`, `P0`, or `P1` findings. `P2`/`P3` findings are warnings unless policy says otherwise. Acceptance-relevant `BLOCKED`/`NOT TESTED` MUST normally block. A non-runtime documentation/configuration exception MAY proceed only with an explicit human identity, reason, scope, and expiration; the original verdict MUST remain visible and an agent MUST NOT issue the waiver.

#### Scenario: Archive decision

- GIVEN verification passes and QA reports a blocking result or release-blocking finding
- WHEN archive evaluates policy
- THEN it blocks or records the permitted human exception and preserves the original result
