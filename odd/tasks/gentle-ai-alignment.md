# Gentle AI alignment

## Objective
Evolve the OpenCode-first agent harness toward Organic Driven Development (ODD), explicit SDD admission, transactional Receipt-Driven Development (RDD), persistent Engram context, and real component/preset materialization.

## Problem
The harness currently has useful SDD, Engram, and prompt-level review pieces, but routing, review authority, and configuration composition are not represented as explicit deterministic contracts.

## Why
Adopt the philosophy of Gentle AI without importing its multi-runtime product: keep everyday work lightweight, make formal workflows opt-in, and make review evidence bounded and trustworthy.

## Scope
- Replace automatic SDD admission with explicit-only SDD routing.
- Add ODD task tracking for substantial non-SDD work.
- Add an opt-in RDD control plane with immutable candidate bindings.
- Add component/preset/persona configuration and an effective-tree renderer.
- Document all registered agents and embedded specialist profiles.
- Preserve the manual Judgment Day workflow.

## Constraints
- OpenCode-first; no multi-runtime installer.
- No commit, push, submodule update, or Dotter deployment without separate authorization.
- Preserve existing agent names and capabilities.
- TDD is resolved per project; enabled mode requires RED → GREEN → REFACTOR.

## Tasks
- [x] ODD-001 Define config and task artifact contracts with failing fixtures.
- [x] ODD-002 Implement ODD task lifecycle and routing guidance.
- [x] ODD-003 Implement configuration renderer and generated effective tree.
- [x] ODD-004 Implement RDD candidate freeze, state machine, and CLI.
- [x] ODD-005 Integrate reviewer bindings while preserving manual Judgment Day.
- [x] ODD-006 Update documentation and agent matrix.
- [x] ODD-007 Run focused, compatibility, and distribution checks.

## Acceptance criteria
- SDD is selected only after explicit user request or accepted proposal.
- Substantial ODD work creates and resumes one task document with stable IDs.
- RDD is off by default, freezes a candidate without changing the real index, rejects stale/mismatched transitions, permits one correction, and requires exact acknowledgement before burn.
- Presets render deterministically and disabled assets are absent from the effective tree.
- Existing Judgment Day and SDD smoke checks remain available.

## Verification evidence
node --test scripts/tests/*.test.mjs (10 passing); GIT_CONFIG_GLOBAL=/dev/null bash scripts/sdd-control-plane-smoke.sh (PASS); bash scripts/sdd-smoke.sh, scripts/sdd-fsm-smoke.sh, scripts/sdd-handoff-smoke.sh, scripts/sdd-capability-adapters-smoke.sh, scripts/sdd-quality-smoke.sh (PASS); bash scripts/odd-rdd-smoke.sh (PASS); node scripts/harness-config.mjs render/check (PASS); git diff --check (PASS).


- `node scripts/harness-config.mjs render` followed by `node scripts/harness-config.mjs check` — effective tree rendered reproducibly with optional assets removed when disabled.
- Compatibility smoke scripts and `git diff --check` remain to be run before closing.

## Progress
Core ODD, RDD, routing, configuration, generated-tree, and documentation slices are implemented. Focused tests and all compatibility smoke checks pass; the control-plane fixture required isolated GIT_CONFIG_GLOBAL=/dev/null because the host global config enforces unavailable GPG signing. Dotter deployment remains intentionally separate and unauthorized.



## Next step
Request separate authorization before publication, submodule update, or Dotter deployment; otherwise the implementation is ready for review.


