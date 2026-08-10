# Delta for Change Impact Set

## MODIFIED Requirements

### Requirement: Calculate a deterministic Git impact set

The system MUST calculate the source impact set from an explicit Git `base_sha` to `head_sha`. Paths MUST be project-relative POSIX paths, free of `.` or `..` segments and absolute prefixes, then sorted before computing a stable digest that includes the endpoints and canonical path data. Adapter scope `project` MUST mean the requested project scope; `changed-files` MUST use this Git impact set and MUST NOT be substituted with project scope.

(Previously: The impact set was deterministic and exposed changed/affected paths, but adapter project-versus-changed-files scope was deferred.)

#### Scenario: Reproducible changed paths

- GIVEN the same repository, base SHA, head SHA, and Git metadata
- WHEN impact calculation runs more than once
- THEN it returns the same normalized paths and digest
- AND equivalent input ordering does not change the digest

#### Scenario: Distinct adapter scopes

- GIVEN an adapter requests `project` or `changed-files`
- WHEN scope evidence is attached
- THEN `project` covers the requested project and `changed-files` covers exactly the calculated changed paths
- AND a global result is not labeled `changed-files`

### Requirement: Report unavailable Git scope honestly

The system MUST return `UNAVAILABLE` or `BLOCKED`, according to explicit policy, when Git, a required ref, sufficient history, or the requested `changed-files` evidence is missing. It MUST NOT treat an empty, guessed, global, or fallback path set as a successful complete impact set.

(Previously: Missing Git, refs, or history produced an honest non-passing scope result, without adapter-specific fallback rules.)

#### Scenario: Shallow or missing repository

- GIVEN the repository is shallow, Git is unavailable, or base/head cannot be resolved
- WHEN a `changed-files` adapter starts
- THEN it records the constraint and returns `UNAVAILABLE` or `BLOCKED`
- AND required scope cannot produce `PASS`

#### Scenario: Unsupported scope substitution

- GIVEN only project/global coverage is available for a requested `changed-files` result
- WHEN an adapter evaluates scope
- THEN it returns a non-passing status with an incompatible-scope reason
- AND it does not widen or narrow the request silently

### Requirement: Keep adapter expansion bounded

Slice 1 MUST define only `project` and `changed-files` adapter scopes. Function, boundary, dependency, affected-test, acceptance, CRAP, mutation, DRY, and architecture mappings MUST NOT be inferred or claimed by this change; any unsupported finer scope MUST be explicitly `UNAVAILABLE`.

(Previously: Future adapters could add finer mappings if they declared semantics and provider.)

#### Scenario: Adapter mapping is absent

- GIVEN changed files exist but no finer-scope adapter is registered
- WHEN an unsupported finer scope is requested
- THEN file scope remains available
- AND the unsupported scope is explicitly `UNAVAILABLE`, not guessed

#### Scenario: Malicious path input

- GIVEN Git or a manifest presents an absolute path, traversal path, or escaping symlink
- WHEN paths are normalized
- THEN the entry is rejected and recorded as a scope error
- AND it cannot affect files outside the project
