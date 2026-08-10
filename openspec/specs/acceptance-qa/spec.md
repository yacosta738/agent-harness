# Acceptance QA Specification

## Purpose

Define capability-driven acceptance of observable behavior without replacing technical verification or assuming a product, runner, or runtime.

## Requirements

### Requirement: Separate verification and QA

`verify` MUST own requirements, design, task, and available technical-runtime conformance. `qa` MUST own user/operator acceptance, MUST NOT repair code, and MUST return findings for implementation.

#### Scenario: Independent handoff

- GIVEN implementation and technical verification are complete
- WHEN QA starts
- THEN it evaluates acceptance separately from `verify-report.md`
- AND records acceptance evidence without duplicating conformance checks

### Requirement: Register and route QA

The project MUST register an `sdd-qa` executor and route `apply → verify → qa → archive`. `verify` MUST hand off to QA; archive MUST NOT be selected before QA or an allowed exception.

#### Scenario: Normal routing

- GIVEN apply and verify complete
- WHEN continuation resolves the next phase
- THEN it selects QA and requires `qa-report.md` before archive

### Requirement: Select QA from capabilities and sources of truth

QA MUST derive scenarios from proposal capabilities, specifications, design, and target surface; code MUST NOT be its sole source. It MUST select available capabilities and avoid product-specific assumptions.

#### Scenario: Capability selection

- GIVEN a target and suitable browser, API, data, accessibility, manual, or equivalent capability exist
- WHEN QA selects a capability
- THEN it records capability, target, environment, and scenarios attempted

#### Scenario: No executable capability

- GIVEN no appropriate target or capability exists
- WHEN QA evaluates the change
- THEN it records `NOT TESTED`, untested scope, and reason
- AND static inspection MUST NOT produce a passing result

### Requirement: Cover applicable acceptance risks

QA MUST consider applicable negative, boundary, security, state-transition, browser, accessibility, responsive, internationalization, persistence, and exploratory behavior, recording why any category is not applicable.

#### Scenario: Risk and environment coverage

- GIVEN invalid, extreme, repeated, interrupted, unauthorized, or stateful behavior is relevant
- WHEN QA exercises it with relevant browser, viewport, locale, or assistive-technology capabilities
- THEN rejection, recovery, isolation, persistence, tested combinations, and untested combinations are recorded with evidence

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

### Requirement: Preserve state and resume safely

`state.yaml` and continuation MUST represent QA distinctly, select QA when verification is complete but its report is absent or incomplete, preserve evidence for rerun, and never skip directly to archive.

#### Scenario: Resume in flight

- GIVEN a change stops during QA
- WHEN continuation resumes
- THEN it selects QA with existing evidence available
- AND archive remains unavailable until the gate or explicit exception is satisfied

### Requirement: Integrate evidence without duplicating the runner or FSM

Slice 1 of the new control plane MUST consume the existing runner result states, redaction, artifact rules, locks, revision checks, and `state.yaml` guards. It MUST NOT create a second runner/FSM, change the prior `deterministic-quality-runners-fsm` change, or enable either feature flag by default. Durable handoffs (`handoff/v1`) and the event log (`events.jsonl`) are implemented in Slice 3; runtime plugins and distribution rollout remain deferred (Slices 5–6, not implemented).

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
