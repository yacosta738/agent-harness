## Exploration: capability-adapters

### Current State

The repository already has an opt-in, dependency-light quality runner whose execution path is declarative rather than hardcoded to a language stack. `openspec/quality-runner.json` remains disabled at the repository root, while the runner library validates capabilities, executes argv commands or explicitly opted-in shell commands, applies environment allowlists, timeouts, output/artifact limits, redaction, parsers, thresholds, and status classification. The existing result vocabulary is `PASS`, `FAIL`, `BLOCKED`, `UNAVAILABLE`, and `NOT_TESTED`; missing or disabled capabilities are not treated as passing.

`metrics.mjs` already exposes `metrics/v1` and normalizers for several metric families, but its contract is currently narrow: it requires provider/version/semantics and does not yet formalize a capability registry, adapter identity, normalized output, artifact references, or scope as one reusable adapter contract. The runner result layer already records raw execution evidence and artifact hashes, so the adapter slice should extend those boundaries rather than introduce a second execution engine.

There is no root application test runner, package manifest, or repo-wide linter/coverage tool. The available environment provides Node `24.16.0` with built-in test and experimental coverage support, Python `3.14.6` with pytest `9.1.1`, ShellCheck `0.11.0`, Git `2.55.0`, and Bash `3.2.57`; Python coverage and common Python linters are unavailable. Therefore the initial adapters must report provider availability honestly and must never install tools, download versions, resolve `latest`, or silently infer a stack-specific command.

Scope semantics must remain explicit: `project` means the requested project scope, while `changed-files` is derived through the existing Git impact calculation and must not be substituted for `project` without an explicit request. Global quality-runner, control-plane, and FSM gates remain disabled for this slice.

### Affected Areas

- `scripts/sdd-runner-lib/metrics.mjs` — extend `metrics/v1` with the formal adapter/metric contract, registry entries, normalized values, scope, and provider semantics.
- `scripts/sdd-runner-lib/config.mjs` — validate registry and adapter declarations while preserving existing argv-by-default and shell opt-in safety rules.
- `scripts/sdd-runner-lib/result.mjs` — preserve generic runner statuses and add adapter/provider/version/semantics/scope/raw/normalized/artifact fields without weakening failure classification.
- `scripts/sdd-quality-runner.mjs` — compose registry lookup, adapter dispatch, execution, normalization, and evidence in the existing runner flow.
- `scripts/sdd-runner-lib/toolchain.mjs` — enforce pinned provider identities and versions; reject `latest`, implicit downloads, or unresolved toolchain entries.
- `scripts/sdd-runner-lib/git-impact.mjs` — provide the existing `changed-files` scope and deterministic digest to adapters that request it.
- `openspec/quality-runner.schema.json` — describe the new registry/adapter configuration shape while retaining compatibility with the current manifest version or making a deliberate versioned extension.
- `openspec/quality-runner.json` — remain disabled at the root; add no default capability that could claim repository health.
- `openspec/quality-toolchain.lock` — add only intentionally supported, locally verified provider pins; do not add packages that are absent from the environment.
- `scripts/fixtures/` and `scripts/*smoke*.sh` — add focused executable fixtures for pass/fail/unavailable/not-tested behavior, normalization, artifacts, and both scope modes.
- `openspec/specs/capability-policy/spec.md` and related evidence/scope specs — align the deferred Slice 4 adapter contract with the existing policy, evidence authority, and impact-set rules.
- `openspec/changes/capability-adapters/` — persist this exploration and subsequent SDD artifacts; do not modify the archived control-plane change.

### Approaches

1. **Thin registry over the existing generic runner** — define a formal registry and adapter metadata, map `test`, `lint`, and `coverage` to configured commands, and reuse the current execution/result/evidence pipeline. Adapters only normalize provider output; they do not own process execution.
   - Pros: smallest blast radius; preserves established security controls and status semantics; works for arbitrary project stacks; avoids duplicate runners; supports incremental rollout with gates off.
   - Cons: provider-specific parsing and coverage semantics need careful versioned contracts; existing manifest/schema must be extended without ambiguous backward compatibility.
   - Effort: Medium

2. **Dedicated per-provider adapter executors** — add separate Node, pytest, ShellCheck, and coverage execution modules that discover or invoke their tools directly.
   - Pros: can provide richer provider-native parsing and defaults; easier to optimize for each tool in isolation.
   - Cons: duplicates command safety, timeout, artifact, and status handling; risks implicit stack detection and unpinned behavior; unavailable providers become harder to distinguish from misconfiguration; larger review and maintenance surface.
   - Effort: High

3. **Model/prompt-selected adapters** — keep registry metadata mostly descriptive and let SDD phase agents choose commands and interpret outputs.
   - Pros: minimal code and quick initial adoption.
   - Cons: does not meet the deterministic contract; allows invented commands, silent scope changes, and false passes; cannot provide auditable normalized results.
   - Effort: Low

### Recommendation

Choose Approach 1. Treat the existing runner as the sole execution authority and add a small, versioned capability registry plus adapters that perform declaration validation and output normalization only. Start with three capability families: tests, lint, and coverage. The initial provider set should be explicitly configured and locally verifiable: Node built-in test, pytest, and ShellCheck for test/lint examples; Node built-in experimental coverage where supported; Python coverage should remain `UNAVAILABLE` unless a project explicitly supplies a pinned provider. A configured but unavailable provider must produce `UNAVAILABLE` or `BLOCKED` with a reason, never `PASS`.

The adapter result should retain the runner envelope and add stable fields for `provider`, `provider_version`, `semantics`, `scope`, `raw`, `normalized`, and `artifacts`. `project` and `changed-files` should be first-class scope values, with Git impact evidence attached only when requested. Toolchain identity must come from the lock/configuration and reject `latest`, network resolution, and downloads. Keep all feature gates off and make the first slice testable with fixtures/smoke scripts rather than claiming a repository-wide quality baseline.

Implementation should be split into reviewable units because the 400-line review guard applies: first contract/registry and validation, then adapters and normalization, then fixtures/evidence integration. The proposal should define compatibility/versioning, exact provider matrix, scope behavior, and rollback before implementation.

### Risks

- Existing `metrics/v1` consumers may rely on the current minimal contract; adding required fields without a compatibility strategy could break archived or in-flight evidence.
- Provider output formats and version-specific CLI flags can change; adapters need pinned versions and fixture-based contract tests.
- Node coverage is experimental and Python coverage is unavailable in this environment; coverage results must not be represented as complete when the provider cannot run.
- Auto-discovery or implicit defaults could execute the wrong tool or make an unavailable capability look healthy; explicit configuration must win.
- `changed-files` scope depends on Git state and dirty-worktree policy; adapters must preserve blocked/unknown impact rather than widening or narrowing scope silently.
- Artifact paths and raw output can contain sensitive data; existing containment, size limits, redaction, and evidence ownership checks must remain authoritative.
- The repository worktree is already dirty from prior work; exploration must not clean it, and later fixture validation must distinguish pre-existing changes from adapter behavior.
- Expanding schema, runner code, metrics, fixtures, and docs in one slice may exceed the 400-line review budget; use chained/reviewable slices in task planning.

### Ready for Proposal

Yes. The proposal should make the registry location and precedence, `metrics/v1` compatibility/versioning, supported provider matrix, unavailable coverage policy, scope semantics, toolchain pinning, artifact/evidence fields, rollout gates, and review slices explicit. It should also state that the root repository has no general test/lint/coverage runner and that validation will use focused executable fixtures and smoke checks.

**Status**: success
**Executive Summary**: The existing runner already provides safe execution, status classification, evidence, artifacts, and Git impact scope; the missing piece is a formal registry and adapter contract. A thin adapter layer over that runner is the lowest-risk MVP for tests, lint, and coverage, with explicit providers, honest unavailable states, pinned toolchains, and gates left off.
**Artifacts**: `openspec/changes/capability-adapters/exploration.md`
**Next Recommended**: `sdd-propose`
**Risks**: Contract compatibility, provider/version drift, unavailable coverage tooling, implicit command discovery, scope integrity, sensitive evidence, dirty worktree, and 400-line review-budget risk.
**Skill Resolution**: `fallback-registry` — applied the repository SDD/OpenSpec shared contracts and `.agents/skill-registry.md` compact rules.
