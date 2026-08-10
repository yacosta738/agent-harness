# Quality Runners Specification

## Purpose

Define project-configured quality execution and evidence with deterministic interpretation of normalized inputs.

## Requirements

### Requirement: Use declarative project capabilities

The runner MUST execute only explicitly enabled project capability definitions. Each definition MUST identify a stable capability, executable and arguments, working-directory rule, timeout, environment allowlist, output parser or exit policy, expected artifacts, and blocking policy. Explicit configuration MUST take precedence over discovery; absent configuration MUST NOT imply success.

#### Scenario: Unrelated configured stacks

- GIVEN two projects configure different executables and argv
- WHEN the runner executes their enabled capabilities
- THEN it uses each declaration without stack-specific inference
- AND each result identifies the configured capability

#### Scenario: Tool is not configured

- GIVEN a capability has no enabled declaration
- WHEN a phase requests it
- THEN the result is `UNAVAILABLE` or `NOT_TESTED` with a reason
- AND it MUST NOT be `PASS`

### Requirement: Execute commands safely and classify outcomes

The runner MUST use argv-oriented execution by default and MUST require explicit opt-in for shell interpretation. It MUST pass only allowlisted environment variables. A completed command that satisfies its exit, parser, and threshold policy SHALL be `PASS`; a completed policy failure or invalid parser result SHALL be `FAIL`; an absent executable SHALL be `UNAVAILABLE`; an execution prevented by timeout or external constraint SHALL be `BLOCKED`; an intentionally skipped capability SHALL be `NOT_TESTED`.

#### Scenario: Shell opt-in and environment isolation

- GIVEN a capability contains arguments and a non-allowlisted secret
- WHEN it runs without shell opt-in
- THEN arguments are passed without interpolation
- AND the secret is not exposed to the process

#### Scenario: Missing command, timeout, or invalid parser

- GIVEN a configured command is missing, exceeds its timeout, or emits output rejected by its parser
- WHEN the runner completes classification
- THEN the statuses are respectively `UNAVAILABLE`, `BLOCKED`, and `FAIL`
- AND each result includes a machine-readable reason

### Requirement: Emit an auditable result envelope

Every invocation MUST produce a versioned machine-readable envelope containing capability identity, resolved command identity, working directory, duration, exit code when available, status, parser outcome, redacted output or evidence references, and artifact paths. Redaction rules MUST prevent configured sensitive values from appearing in persisted envelopes, reports, or surfaced output while retaining non-sensitive evidence.

#### Scenario: Evidence and sensitive output

- GIVEN a command emits a configured secret and a diagnostic failure
- WHEN the runner writes its envelope and artifacts
- THEN the secret is redacted everywhere persisted or displayed
- AND the failure, exit information, reason, and redacted evidence remain available

#### Scenario: Repeatable interpretation

- GIVEN identical normalized configuration, command outcome, parser result, and policy inputs
- WHEN the runner classifies the invocation more than once
- THEN it produces the same status and reason classification
- AND it does not use model prose as quality evidence

### Requirement: Preserve artifacts and evidence for consumers

The runner MUST write or reference the configured machine envelope and human-readable evidence artifact for every attempted capability, including `UNAVAILABLE`, `BLOCKED`, and `NOT_TESTED`. Verify and QA MUST be able to identify the run and its limitations from those artifacts.

#### Scenario: Failed capability remains inspectable

- GIVEN an attempted capability exits non-zero
- WHEN the run is reported
- THEN its `FAIL` envelope, output evidence, exit code, and artifact location are retained
- AND consumers can distinguish it from an unavailable capability
