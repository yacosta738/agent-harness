# Capability Adapters Specification

## Purpose

Define deterministic, declared adapters for tests, lint, and coverage over the existing runner. CRAP, mutation, DRY, acceptance, architecture, permissions, prompts, and distribution adapters are explicitly out of scope and MUST NOT be claimed.

## Requirements

### Requirement: Validate a versioned capability registry

The registry MUST version declarations and require unique IDs, provider, exact `provider_version` plus immutable digest, adapter, semantics, scope, and policy. It MUST reject duplicates, missing/unknown fields, `latest`, ranges, downloads, and network resolution.

#### Scenario: Valid declaration
- GIVEN a local provider has an exact version, digest, scope, and policy
- WHEN validation runs
- THEN it accepts deterministically without network access

#### Scenario: Unsafe declaration
- GIVEN an ID is duplicated or a version is `latest`, ranged, or undigested
- WHEN validation runs
- THEN it rejects with a machine-readable reason and cannot pass

### Requirement: Emit the `metrics/v1` adapter contract

Adapter results MUST include `provider`, `provider_version`, `semantics`, `scope`, `raw`, `normalized`, `artifacts`, `status`, `reason`, identity, and provenance. The result MUST be additive and readable by runner v1/v2 consumers.

#### Scenario: Valid result
- GIVEN a declared provider produces valid fixture output
- WHEN the adapter emits `metrics/v1`
- THEN all fields and runner status/evidence remain available

#### Scenario: Incomplete result
- GIVEN scope, identity, or required normalized data is absent
- WHEN validation runs
- THEN it rejects or returns a non-pass reason

### Requirement: Classify test adapter results

A test adapter MUST parse declared-provider fixtures into deterministic `PASS` or `FAIL`; timeout/process errors MUST be `BLOCKED`; an unavailable declared provider MUST be `UNAVAILABLE`. It MUST NOT infer commands or providers.

#### Scenario: Fixture outcomes
- GIVEN valid pass and failing-test fixtures
- WHEN each is parsed
- THEN statuses are `PASS` and `FAIL` with normalized counts and raw evidence

#### Scenario: Execution/provider failure
- GIVEN timeout, process error, or missing provider
- WHEN classification runs
- THEN it returns `BLOCKED`, `BLOCKED`, or `UNAVAILABLE`, each with a distinct reason

### Requirement: Classify lint results

A lint adapter MUST validate format and requested scope and expose normalized error and warning counts. Errors MUST fail policy; warnings MAY pass only when policy permits.

#### Scenario: Valid lint
- GIVEN valid output for `project` or `changed-files`
- WHEN parsing completes
- THEN counts, format validity, exact scope, and policy status are recorded

#### Scenario: Invalid lint
- GIVEN malformed output or incompatible scope
- WHEN validation runs
- THEN it returns `FAIL` or policy-defined `BLOCKED`/`UNAVAILABLE`, never `PASS`

### Requirement: Report coverage honestly

Coverage adapters MUST report available line, branch, function, and statement metrics only for the requested scope. `project` and `changed-files` MUST remain distinct; global fallback MUST NOT yield changed-files `PASS`.

#### Scenario: Available metrics
- GIVEN a pinned provider emits valid coverage for the requested scope
- WHEN normalized
- THEN each available metric and its availability, semantics, scope, and impact evidence are recorded

#### Scenario: Missing scope/provider
- GIVEN changed-files coverage has only global data or no provider exists
- WHEN evaluated
- THEN it returns `BLOCKED` or `UNAVAILABLE` and cannot claim complete `PASS`

### Requirement: Preserve status semantics

Adapters MUST distinguish provider absence (`UNAVAILABLE`), invalid format or threshold (`FAIL`), timeout/process/external constraint or incompatible scope (`BLOCKED`), policy disabled (`NOT_TESTED`), and successful compliant execution (`PASS`).

#### Scenario: Disabled capability
- GIVEN policy marks a capability disabled
- WHEN requested
- THEN it is `NOT_TESTED` with a reason and no command executes

#### Scenario: Classification boundary
- GIVEN absent provider, malformed output, incompatible scope, or valid success
- WHEN classified
- THEN each receives its distinct status and only success may pass

### Requirement: Protect artifacts and evidence

Raw output and artifacts MUST redact configured secrets, stay inside the project boundary, and expose hashes verifiable against exact persisted bytes. Path rejection, leakage, hash mismatch, and configured output/artifact limit violations MUST be non-passing.

#### Scenario: Safe bounded artifact
- GIVEN secret-bearing output and an in-bound artifact
- WHEN persisted
- THEN secrets are absent and the stored hash verifies exact bytes

#### Scenario: Integrity or limit failure
- GIVEN traversal/escaping path, changed bytes, or exceeded configured limit
- WHEN collection or verification runs
- THEN it rejects or returns a controlled non-pass without touching outside files

### Requirement: Roll out compatibly and reversibly

Existing runner v1/v2 behavior MUST remain compatible. Flags MUST remain off; no global enforcement may run implicitly. Rollback MUST remove declarations/revert adapter artifacts without changing prior evidence or archived changes.

#### Scenario: Disabled rollout
- GIVEN quality-runner and control-plane flags are off
- WHEN this change is present
- THEN no adapter or global gate runs implicitly and legacy statuses remain unchanged

#### Scenario: Rollback
- GIVEN registry and adapter artifacts are reverted
- WHEN the prior runner runs
- THEN old evidence remains readable, no migration is required, and the archived control-plane change is untouched
