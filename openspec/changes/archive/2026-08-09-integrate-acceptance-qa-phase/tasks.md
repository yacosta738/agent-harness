# Tasks: Integrate Acceptance QA Phase

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 380–400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR: one coherent lifecycle contract slice |
| Delivery strategy | single-pr |
| Chain strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Register, define, route, document, and smoke-validate QA | PR 1 | Explicit base: current trunk; keep the contract/docs diff within 400 changed lines; no app or runner is introduced |

## Phase 1: Infrastructure / Contracts

- [x] 1.1 Modify `opencode.json` to register hidden `sdd-qa` with read/bash/write-only tools and grant Kerrigan `task.sdd-qa`; verify existing MCP enablement is unchanged.
- [x] 1.2 Create `commands/sdd-qa.md`, `prompts/sdd/sdd-qa.md`, and `skills/sdd/sdd-qa/SKILL.md`; define capability selection, no-code-mutation, verdict/severity vocabulary, and Section D envelope.
- [x] 1.3 Update `skills/sdd/_shared/openspec-convention.md` with `qa-report.md` retrieval, persistence, archive, and report-preservation rules; verify paths match the design.

## Phase 2: Executor / Reporting

- [x] 2.1 Specify `qa-report.md` in `prompts/sdd/sdd-qa.md`/`skills/sdd/sdd-qa/SKILL.md`: identity, sources, target, capabilities, scenarios, evidence, untested scope, findings, verdict, rationale, limitations.
- [x] 2.2 Require runtime capability resolution to record selected/rejected capabilities and return `NOT TESTED` without a target/capability or `BLOCKED` for external constraints; static inspection MUST NOT pass.
- [x] 2.3 Keep `prompts/sdd/sdd-apply.md` as a handoff-only phase and `prompts/sdd/sdd-verify.md` as technical conformance; document the explicit handoff to QA without duplicating acceptance checks.

## Phase 3: Lifecycle / Archive Integration

- [x] 3.1 Update `commands/sdd-continue.md` and `AGENTS.md` to route `apply → verify → qa → archive`, resume QA when `qa-report.md` is absent/incomplete, and prevent early archive selection.
- [x] 3.2 Update `prompts/sdd/sdd-archive.md` to require both reports, block `FAIL`/missing reports/CRITICAL-P0-P1, and allow documented non-runtime exceptions for config/docs changes only.
- [x] 3.3 Configure `openspec/config.yaml` with QA verdicts, severity, required-surface, blocked/not-tested policies, and archive report requirements; preserve strict TDD disabled.

## Phase 4: Documentation / Registry

- [x] 4.1 Update `README.md` phase count, DAG, commands, artifact tree, quality gates, and no-runner limitation; reference reusable browser/manual capabilities rather than duplicating them.
- [x] 4.2 Update `.agents/skill-registry.md` and prompt/skill indexes for `sdd-qa`, `qa-report.md`, and capability-driven limitations; remove stale nine-executor references.

## Phase 5: Validation

- [x] 5.1 Validate JSON and referenced paths with `node`; inspect Markdown contracts for required verdicts, severity, DAG, archive gate, and report fields.
- [x] 5.2 Parse YAML when tooling is available and verify configuration/state recovery semantics; do not add a runner, fixture app, or product-specific scenario.
- [x] 5.3 Record verification limits: this repository has no general test runner and no application under test, so harness smoke checks cannot claim product acceptance; TDD RED→GREEN→REFACTOR evidence is unavailable; QA must produce `NOT TESTED`/`BLOCKED` with evidence.
