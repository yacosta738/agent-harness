# Delta for Evidence Trust Boundary

## MODIFIED Requirements

### Requirement: Emit versioned, identity-bound evidence

The runner MUST emit a versioned evidence envelope bound to `change_id`, `task_id`, `run_id`, `base_sha`, `head_sha`, impact-set digest, configuration and command identity, provider/toolchain identity, adapter identity, semantics, scope, artifact hashes, timestamp, execution result, and redacted raw and normalized output.

(Previously: The envelope required runner/provider identity and artifacts but did not define the adapter contract fields.)

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

### Requirement: Keep evidence paths inside the trust boundary

Artifact references, raw output, normalized output, and evidence paths MUST be normalized, project-scoped, and unable to escape through absolute paths, traversal segments, or symlinks. Secrets MUST be redacted before persistence. A rejected path, secret leak, or hash mismatch MUST produce a controlled non-pass result.

(Previously: Artifact references and evidence paths were bounded, but adapter output redaction and hash-integrity failures were not explicit.)

#### Scenario: Path traversal attempt

- GIVEN an adapter declares `../outside.json` or a symlink escaping the project
- WHEN artifact collection or evidence persistence runs
- THEN the path is rejected
- AND no outside file is read or overwritten

#### Scenario: Secret or hash-integrity failure

- GIVEN raw output contains a configured secret or an artifact changes after its hash is recorded
- WHEN evidence is persisted or consumed
- THEN the secret is absent and the hash mismatch is rejected or marked `BLOCKED`
- AND the evidence cannot support `PASS`

## ADDED Requirements

### Requirement: Preserve adapter/result compatibility

Adapter evidence MUST be additive to existing runner result envelopes. Consumers of runner v1 and v2 MUST continue to read status, reason, execution evidence, and artifact references without requiring adapter fields when consuming legacy results.

#### Scenario: Legacy result consumer

- GIVEN a legacy v1 or v2 result without adapter fields
- WHEN an evidence consumer reads it
- THEN existing fields remain interpretable
- AND missing adapter metadata is not silently treated as adapter success
