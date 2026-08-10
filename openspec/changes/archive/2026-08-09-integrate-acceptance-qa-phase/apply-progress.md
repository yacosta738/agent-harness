# Apply Progress: integrate-acceptance-qa-phase

## Delivery
- Strategy: `single-pr`
- Chain strategy: `single-pr`
- Base: `main` (current trunk)
- Scope: one coherent lifecycle-contract slice; no chaining and no size exception required
- Forecast: Medium risk, 380–400 planned lines; the explicit task decision says single PR and no exception is needed. Focused implementation/progress artifacts are documented separately from the pre-existing OpenSpec planning artifacts.

## Completed Tasks
- [x] 1.1 Registered hidden `sdd-qa` in `opencode.json`, granted Kerrigan permission, and preserved existing MCP configuration.
- [x] 1.2 Added `commands/sdd-qa.md`, `prompts/sdd/sdd-qa.md`, and `skills/sdd/sdd-qa/SKILL.md` with capability, report, no-mutation, verdict, severity, and envelope contracts.
- [x] 1.3 Added `qa-report.md` OpenSpec retrieval, persistence, archive-preservation, and two-report gate rules.
- [x] 2.1 Defined the complete `qa-report.md` structure in the QA prompt and skill.
- [x] 2.2 Defined runtime capability resolution, selected/rejected capability evidence, `NOT TESTED`/`BLOCKED`, and no-static-pass behavior.
- [x] 2.3 Kept apply handoff-only and verify technical-only, with explicit verify-to-QA handoff.
- [x] 3.1 Updated DAG/state/continue/orchestrator contracts for `apply → verify → qa → archive` and safe QA recovery.
- [x] 3.2 Added archive two-report and severity/exception gate to archive prompt and skill.
- [x] 3.3 Added QA verdict, severity, required-report, blocked/not-tested, and exception policy to `openspec/config.yaml`; strict TDD remains disabled.
- [x] 4.1 Updated README phase count, DAG, command list, artifact tree, quality gates, and no-runner/no-product-target limitation.
- [x] 4.2 Updated `.agents/skill-registry.md` for QA routing, report contract, and capability-driven limitations.
- [x] 5.1 Ran focused Node JSON/path smoke validation and Markdown contract checks.
- [x] 5.2 Parsed YAML with available tooling and checked state/config recovery semantics.
- [x] 5.3 Recorded that the repository has no general test runner and no application under test; product acceptance is not claimed.

## TDD / Validation Limits
This repository has no package manifest, test script, pytest configuration, Makefile test target, or application under test. No executable RED→GREEN→REFACTOR cycle could be run without inventing a runner, so TDD compliance is not claimed. Validation uses focused JSON/YAML/Markdown/path smoke checks only. QA for this harness must produce `NOT TESTED` or `BLOCKED` with evidence rather than claim acceptance.

## Validation Evidence
- `node` JSON and referenced-path smoke check: passed.
- Ruby Psych YAML parse for config/state: passed.
- Focused Markdown contract and tasks checkbox check: passed.
- `yamllint -d relaxed`: warnings only for pre-existing/long documentation lines; no parse errors.
- `git diff --check`: passed.
- Test-runner detection: no `package.json`, `pyproject.toml`, `pytest.ini`, `Makefile`, or `GNUmakefile`; no executable TDD cycle run and no TDD compliance claimed.

## Files Changed
- `opencode.json`
- `commands/sdd-qa.md`
- `prompts/sdd/sdd-qa.md`
- `skills/sdd/sdd-qa/SKILL.md`
- `skills/sdd/_shared/openspec-convention.md`
- `skills/sdd/_shared/sdd-phase-common.md`
- `prompts/sdd/sdd-apply.md`
- `prompts/sdd/sdd-verify.md`
- `prompts/sdd/sdd-archive.md`
- `skills/sdd/sdd-apply/SKILL.md`
- `skills/sdd/sdd-verify/SKILL.md`
- `skills/sdd/sdd-archive/SKILL.md`
- `commands/sdd-continue.md`
- `AGENTS.md`
- `README.md`
- `.agents/skill-registry.md`
- `openspec/config.yaml`
- `openspec/changes/integrate-acceptance-qa-phase/state.yaml`
- `openspec/changes/integrate-acceptance-qa-phase/tasks.md`
- this apply-progress artifact
