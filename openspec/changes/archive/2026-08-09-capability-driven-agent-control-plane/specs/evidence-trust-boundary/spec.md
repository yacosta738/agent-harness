# Evidence Trust Boundary Specification

## Purpose

Define when runner evidence is trustworthy, current, and eligible to support a gate. Slice 1 covers the envelope, freshness checks, and path boundary; event-log and waiver integrations remain future contracts.

## Requirements

### Requirement: Emit versioned, identity-bound evidence

The runner MUST emit a versioned evidence envelope bound to `change_id`, `task_id`, `run_id`, `base_sha`, `head_sha`, impact-set digest, configuration and command identity, provider/toolchain identity, artifact hashes, timestamp, execution result, and redacted output.

#### Scenario: Valid evidence envelope

- GIVEN a capability runs against a declared base and head
- WHEN the runner persists its result
- THEN the envelope contains every required identity, digest, hash, and timestamp
- AND the artifact hash covers the exact persisted artifact bytes

#### Scenario: Incomplete or foreign identity

- GIVEN evidence omits an identity field or names another change, task, run, or SHA
- WHEN a gate evaluates it
- THEN the evidence is rejected or marked `BLOCKED`
- AND it MUST NOT support `PASS`

### Requirement: Reject stale and replayed evidence

Evidence MUST be stale or rejected when current `HEAD`, configuration, command, toolchain identity, impact-set digest, or referenced artifact hash differs from the envelope. A replay MUST NOT be accepted merely because its result text says `PASS`.

#### Scenario: HEAD or scope changed

- GIVEN evidence was produced for SHA A or impact digest A
- WHEN the gate evaluates SHA B or impact digest B
- THEN it reports stale/replay evidence
- AND the gate result is not `PASS`

#### Scenario: Configuration or artifact changed

- GIVEN the source SHA is unchanged but config or toolchain digest changes, or an artifact hash no longer matches
- WHEN the evidence is consumed
- THEN it is invalidated and requires a fresh run

### Requirement: Keep evidence paths inside the trust boundary

Artifact references and evidence output paths MUST be normalized, project-scoped, and unable to escape through absolute paths, traversal segments, or symlinks. A rejected path MUST produce a controlled non-pass result.

#### Scenario: Path traversal attempt

- GIVEN a capability declares `../outside.json` or a symlink escaping the project
- WHEN artifact collection or evidence persistence runs
- THEN the path is rejected
- AND no outside file is read or overwritten

### Requirement: Preserve deterministic gate authority

Only validated runner/FSM outcomes MAY create a gate result. Agent prose, Markdown, or a claimed waiver MUST NOT manufacture `PASS`, alter evidence, or advance state.

#### Scenario: Agent prose claims pass

- GIVEN an agent writes “PASS” while the evidence is `UNAVAILABLE`, stale, or invalid
- WHEN the gate is evaluated
- THEN the controlled result remains non-passing with its reason
- AND the agent text is retained only as interpretation
