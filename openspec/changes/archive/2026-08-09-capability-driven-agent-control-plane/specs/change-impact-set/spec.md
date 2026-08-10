# Change Impact Set Specification

## Purpose

Define a deterministic, auditable source scope for capability execution and evidence freshness.

## Requirements

### Requirement: Calculate a deterministic Git impact set

The system MUST calculate the source impact set from an explicit Git `base_sha` to `head_sha`. Paths MUST be project-relative POSIX paths, free of `.` or `..` segments and absolute prefixes, then sorted before computing a stable digest that includes the endpoints and canonical path data.

#### Scenario: Reproducible changed paths

- GIVEN the same repository, base SHA, head SHA, and Git metadata
- WHEN impact calculation runs more than once
- THEN it returns the same normalized paths and digest
- AND equivalent input ordering does not change the digest

#### Scenario: Changed and affected scopes

- GIVEN Git reports changed source and test paths
- WHEN a capability requests scope
- THEN `changed` contains the directly changed paths
- AND `affected` may include declared adapter mappings without silently widening to the whole repository

### Requirement: Report unavailable Git scope honestly

The system MUST return `UNAVAILABLE` or `BLOCKED`, according to explicit policy, when Git, a required ref, or sufficient history is missing. It MUST NOT treat an empty or guessed path set as a successful complete impact set.

#### Scenario: Shallow or missing repository

- GIVEN the repository is shallow, Git is unavailable, or base/head cannot be resolved
- WHEN a scope-dependent gate starts
- THEN it records the constraint and returns `UNAVAILABLE` or `BLOCKED`
- AND required scope cannot produce `PASS`

### Requirement: Keep adapter expansion bounded

Slice 1 MUST define changed-file scope only. Function, boundary, dependency, affected-test, and acceptance mappings MAY be added by future adapters, but each MUST declare its semantics, provider, and unavailable state rather than infer scope from LLM reasoning.

#### Scenario: Adapter mapping is absent

- GIVEN changed files exist but no function or boundary adapter is registered
- WHEN mutation, CRAP, or architecture scope is requested
- THEN file scope remains available
- AND the unsupported finer scope is explicitly `UNAVAILABLE`, not guessed

#### Scenario: Malicious path input

- GIVEN Git or a manifest presents an absolute path, traversal path, or escaping symlink
- WHEN paths are normalized
- THEN the entry is rejected and recorded as a scope error
- AND it cannot affect files outside the project
