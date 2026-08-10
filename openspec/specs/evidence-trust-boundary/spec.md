# Evidence Trust Boundary Specification

## Purpose

Define when runner evidence is trustworthy, current, and eligible to support a gate. Slice 1 covers the envelope, freshness checks, and path boundary. The event-log integration (append-only `events.jsonl` with contiguous sequence, payload hashes, and actor provenance) was implemented in Slice 3; human-waiver integration remains deferred (Slice 5, not implemented).

## Requirements

### Requirement: Emit versioned, identity-bound evidence

The runner MUST emit a versioned evidence envelope bound to `change_id`, `task_id`, `run_id`, `base_sha`, `head_sha`, impact-set digest, configuration and command identity, provider/toolchain identity, adapter identity, semantics, scope, artifact hashes, timestamp, execution result, and redacted raw and normalized output.

#### Scenario: Valid adapter evidence envelope

- GIVEN a declared adapter runs against a declared base, head, provider, and scope
- WHEN the runner persists its result
- THEN every required identity, semantic field, digest, hash, timestamp, status, and normalized value is present
- AND each artifact hash covers the exact persisted bytes

#### Scenario: Incomplete or foreign identity

- GIVEN evidence omits an adapter field or names another change, task, run, SHA, provider, or scope
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

Artifact references, raw output, normalized output, and evidence paths MUST be normalized, project-scoped, and unable to escape through absolute paths, traversal segments, or symlinks. Secrets MUST be redacted before persistence. A rejected path, secret leak, or hash mismatch MUST produce a controlled non-pass result.

#### Scenario: Path traversal attempt

- GIVEN a capability declares `../outside.json` or a symlink escaping the project
- WHEN artifact collection or evidence persistence runs
- THEN the path is rejected
- AND no outside file is read or overwritten

#### Scenario: Secret or hash-integrity failure

- GIVEN raw output contains a configured secret or an artifact changes after its hash is recorded
- WHEN evidence is persisted or consumed
- THEN the secret is absent and the hash mismatch is rejected or marked `BLOCKED`
- AND the evidence cannot support `PASS`

### Requirement: Preserve adapter/result compatibility

Adapter evidence MUST be additive to existing runner result envelopes. Consumers of runner v1 and v2 MUST continue to read status, reason, execution evidence, and artifact references without requiring adapter fields when consuming legacy results.

#### Scenario: Legacy result consumer

- GIVEN a legacy v1 or v2 result without adapter fields
- WHEN an evidence consumer reads it
- THEN existing fields remain interpretable
- AND missing adapter metadata is not silently treated as adapter success

### Requirement: Preserve deterministic gate authority

Only validated runner/FSM outcomes MAY create a gate result. Agent prose, Markdown, or a claimed waiver MUST NOT manufacture `PASS`, alter evidence, or advance state.

#### Scenario: Agent prose claims pass

- GIVEN an agent writes “PASS” while the evidence is `UNAVAILABLE`, stale, or invalid
- WHEN the gate is evaluated
- THEN the controlled result remains non-passing with its reason
- AND the agent text is retained only as interpretation
