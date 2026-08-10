# Proposal: Deterministic Quality Runners and SDD FSM

## Intent

The harness currently asks agents to discover commands, interpret text, and select SDD phases. With no root test runner, lint, coverage, or mutation suite, quality evidence is inconsistent and archive can be selected by prose. Provide a project-configured external runner and executable FSM so identical normalized inputs yield identical results and transitions, while agents explain evidence rather than author it.

## Objectives / Non-objectives

- **Objectives:** configurable tools for test/lint/typecheck/build/coverage/mutation/static analysis; normalized evidence; legal SDD transitions, archive gates, atomic `state.yaml`; additive opt-in rollout.
- **Non-objectives:** inventing OpenCode APIs; stack-specific defaults; adding a root test infrastructure; replacing human approval or model interpretation; changing consumer dotfiles in this change.

## Scope

### In Scope
- Standalone, dependency-light scripts under `scripts/`, reading project `openspec/config.yaml`; explicit configuration wins and absent configuration yields `UNAVAILABLE`/`NOT TESTED`.
- Runner status, exit/timeout/parser/redaction policy, raw evidence, and report artifacts.
- FSM compatibility with current state fields, prompt fallback, verify/QA adapters, documentation, and distribution smoke checks.

### Out of Scope
- Automatic npm/pytest/etc. inference that can silently pass; plugin wiring before standalone contracts are proven; product acceptance claims.

## Users / Actors

Project maintainers configure tools; SDD agents interpret evidence; the runner/FSM enforce execution and state; reviewers and dotfiles operators approve rollout.

## Capabilities

### New Capabilities
- `quality-runners`: Configured quality execution and normalized evidence.
- `sdd-workflow-fsm`: Legal transitions, archive gates, atomic and resumable state.

### Modified Capabilities
- `acceptance-qa`: Consume runner evidence while preserving existing verdict, severity, and exception policy.

## Approach

Use argv-by-default external processes with timeouts, environment allowlists, redaction, and machine-readable envelopes. Preserve all four current `state.yaml` fields and add only compatible metadata. The FSM, not prose, accepts transitions. Verify/QA render existing Markdown reports and expose fallback mode. No OpenCode API changes are required in the initial slices.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/` | New | Standalone quality runner and FSM contracts/execution. |
| `openspec/config.yaml` | Modified | Project quality/workflow configuration and opt-in policy. |
| `openspec/changes/*/state.yaml` | Modified | Legal transition, atomic-write, and resume compatibility boundary. |
| `commands/`, `prompts/sdd/`, `skills/sdd/`, `README.md` | Modified | Thin adapters, evidence reporting, fallback and deployment guidance. |

## Rollout and Backward Compatibility

Disabled by default and enabled per project. Existing state and reports remain readable; missing or disabled runner resumes prompt-driven flow and is visibly marked `fallback`, never `PASS`. Roll out harness checkout → dotfiles submodule pointer → Dotter → effective `~/.config/opencode` smoke check. Revert flags, adapters, and scripts without deleting existing artifacts or state.

## Delivery Slices

Four autonomous slices, each forecast to stay within the 400-line review budget: (1) contract/config plus fixtures, (2) runner execution and normalization, (3) FSM/state gates, (4) verify/QA adapters, docs, and distribution smoke checks. Because no root runner exists, fixture/contract smoke checks are required evidence but are not TDD compliance claims.

## Risks / Rollback

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unsafe configured commands | Med | argv default, explicit shell opt-in, allowlists, timeouts, redaction. |
| State races or distribution skew | High | atomic writes, compatibility checks, and three-environment smoke validation. |
| Oversized or coupled review | Med | autonomous slices, measured diff forecasts, optional wiring deferred. |

Rollback is configuration disablement plus reverting the affected slice; preserve prompt routing, Markdown reports, and legacy `state.yaml`.

## Approval / Success Criteria

- Two unrelated configured fixture projects run without stack branches; missing tools never produce `PASS`.
- Each result records command identity, working directory, exit code, duration, redacted output, parser/result, and artifact path.
- Legal transitions succeed; illegal archive is rejected; repeated transitions are idempotent; current state fields are preserved.
- Verify/QA retain evidence and controlled verdicts; model text cannot override runner status; fallback is visible.
- Checkout, dotfiles submodule, and effective Dotter deployment smoke checks pass with no source absolute paths; each slice remains at or below 400 changed lines.
