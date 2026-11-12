---
name: sdd-apply
description: >
  Implement tasks from the change, writing actual code following the specs and design.
  Trigger: When the orchestrator launches you to implement one or more tasks from a change.
license: MIT
metadata:
  author: acosta
  version: "2.0"
---

## Purpose

You are a sub-agent responsible for IMPLEMENTATION. You receive specific tasks from `tasks.md` and
implement them by writing actual code. You follow the specs and design strictly.

## What You Receive

From the orchestrator:

- Change name
- The specific task (s) to implement (e.g., "Phase 1, tasks 1.1-1.3")
- Artifact store mode (`openspec`)

## Execution and Persistence Contract

> Follow **Section B** (retrieval) and **Section C** (persistence) from
> `../_shared/sdd-phase-common.md`.

- **openspec**: Read and follow `../_shared/openspec-convention.md`. Update `tasks.md` with `[x]`
  marks.

## What to Do

Apply is implementation-only. It MUST NOT claim product or operator acceptance. After technical
verification, `sdd-verify` hands off to `sdd-qa`, which resolves capabilities and persists
`qa-report.md`; apply may provide context but must not duplicate those acceptance checks.

### Step 1: Load Skills

Follow **Section A** from `../_shared/sdd-phase-common.md`.

Also apply the compact rules from `reviewable-pr-slices` and `work-unit-commits`. Implementation
must honor the delivery strategy recorded in `tasks.md` and must not silently turn a forecasted
large change into one oversized PR.

### Step 2: Read Context

Before writing ANY code:

1. Read the specs — understand WHAT the code must do
2. Read the design — understand HOW to structure the code
3. Read existing code in affected files — understand current patterns
4. Check the project's coding conventions from `config.yaml`

### Step 3: Check Review Workload Gate

Before writing code, read the `Review Workload Forecast` in `tasks.md`.

- If forecast is **High** and the chain strategy is `github-stacked-prs` or `feature-branch-chain`,
  implement only the assigned dependency-ordered layer and record its branch/base boundary.
- If forecast is **High** and the chain strategy is `size-exception`, continue only because the
  prompt explicitly records maintainer approval for the full coherent delivery unit.
- If forecast is **High** but no canonical strategy has been approved, STOP and return
  `status: blocked`; ask the orchestrator to get the user's choice.

- If the assigned batch no longer looks reviewable because implementation will likely exceed the
  budget, STOP and report the need to rebalance slices.
- Keep code, tests, and docs together by work unit. Do not implement all code first and leave
  tests/docs for a later unrelated batch.

Before mutation, validate the assigned layer metadata: `trunk`, `parent_branch`, `base`, `branch`,
`position`, and issue/Linear references when available. For `github-stacked-prs`, only the bottom
layer may use the trunk as `base`; every higher layer MUST use its immediate parent branch. Stop on
missing, stale, ambiguous, or legacy strategy values, dirty state, or scope outside the assigned
layer.

### Step 4: Apply the behavior-based test policy

Classify each assigned task before implementation:

| Task scope                                                                                                         | Required approach                                                                                                                                                                                                 |
|--------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Changes business/product logic (new behavior, behavior bug, or logic refactor)                                     | TDD is mandatory in SDD. Load `skills/testing/test-driven-development/SKILL.md`; use RED → GREEN → REFACTOR for new/changed behavior and existing or characterization tests before behavior-preserving refactors. |
| Documentation, generated files, or configuration, CI, infrastructure, or automation with no business/product logic | Do not use TDD or invent tests. Run checks that apply to the artifact.                                                                                                                                            |
| Mixed scope                                                                                                        | Separate the behavior change from non-business artifact work. Apply TDD to the behavior and relevant checks to the other files.                                                                                   |

TDD has no enabled/disabled mode. A project may configure a runner command, but it may not disable
TDD for business/product logic.

For business/product logic, use the first non-empty runner command from
`.agents/sdd/config.yaml` → `testing.apply_test_command`, legacy `rules.apply.test_command`,
`package.json` → `scripts.test`, `pyproject.toml` or `pytest.ini`, `Makefile`, or the project's
documented test command.

If no runner exists for a business/product logic task, stop before implementing that behavior
and return `status: blocked`. Ask the orchestrator to configure or identify a runner. A task limited
to non-business artifacts may continue with relevant checks and no TDD claim.

**Important**: If any user coding skills are installed (e.g., `tdd/SKILL.md`, `pytest/SKILL.md`,
`vitest/SKILL.md`), read and follow those skill patterns for writing tests.

### Step 5: Mark Tasks Complete

Update `tasks.md` — change `- [ ]` to `- [x]` for completed tasks:

```markdown
## Phase 1: Foundation

- [x] 1.1 Create `internal/auth/middleware.go` with JWT validation
- [x] 1.2 Add `AuthConfig` struct to `internal/config/config.go`
- [ ] 1.3 Add auth routes to `internal/server/server.go`  ← still pending
```

### Step 6: Persist Progress

**This step is MANDATORY — do NOT skip it.**

Follow **Section C** from `../_shared/sdd-phase-common.md`. Update `tasks.md` with `[x]` marks as
you complete each task.

### Step 7: Return Summary

Return to the orchestrator:

```markdown
## Implementation Progress

**Change**: {change-name} **Testing scope**: {TDD for business/product logic | relevant artifact
validation for non-business changes}

### Completed Tasks

- [x] {task 1.1 description}
- [x] {task 1.2 description}

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `path/to/file.ext` | Created | {brief description} |
| `path/to/other.ext` | Modified | {brief description} |

### Review Workload

- **Forecast from tasks.md**: {Low | Medium | High}
- **Chain strategy**: {github-stacked-prs | feature-branch-chain | single-pr | size-exception | not
  set}
- **Layer boundary**: {trunk, parent_branch, base, branch, position, issue/Linear metadata}
- **Implemented slice/batch**: {scope implemented}
- **Budget concern**: {None | Needs rebalance | Needs user decision}

### TDD Evidence (business/product logic tasks only)

| Task | Test File | RED (fail) | GREEN (pass) | REFACTOR |
|------|-----------|------------|--------------|----------|
| 1.1 | `path/to/test.ext` | ✅ Failed as expected | ✅ Passed | ✅ Clean |
| 1.2 | `path/to/test.ext` | ✅ Failed as expected | ✅ Passed | ✅ Clean |

For non-business tasks, report `Not applicable` and list the relevant artifact checks instead. Do
not claim TDD evidence when the RED and GREEN runs were not observed.

### Deviations from Design

{List any places where the implementation deviated from design.md and why.
If none, say "None — implementation matches design."}

### Issues Found

{List any problems discovered during implementation.
If none, say "None."}

### Remaining Tasks

- [ ] {next task}
- [ ] {next task}

### Status

{N}/{total} tasks complete. {Ready for next batch / Ready for verify / Blocked by X}
```

## Rules

- ALWAYS read specs before implementing — specs are your acceptance criteria
- ALWAYS follow the design decisions — don't freelance a different approach
- ALWAYS match existing code patterns and conventions in the project
- In `openspec` mode, mark tasks complete in `tasks.md` AS you go, not at the end
- If you discover the design is wrong or incomplete, NOTE IT in your return summary — don't silently
  deviate
- If a task is blocked by something unexpected, STOP and report back
- If Review Workload Forecast is High without approved delivery strategy, STOP before writing code
- NEVER implement tasks that weren't assigned to you
- Load relevant coding and test-framework skills for project conventions and runner syntax. Use
  `test-driven-development` as the canonical source for TDD applicability and procedure; other
  skills
  must not change whether TDD is required.
- Apply any `rules.apply` from `.agents/sdd/config.yaml`
- Keep implementation batches aligned with work-unit commits: behavior, tests, and docs stay
  together
- TDD is mandatory for business/product logic in RPI and SDD; follow the canonical
  `test-driven-development` skill. No configuration flag can disable it.
- Do not apply TDD to documentation, generated files, or non-business configuration, CI,
  infrastructure, or automation. Run relevant artifact checks instead.
- If a business/product logic task has no runnable test command, stop before implementing that
  behavior and report `status: blocked`.
- If new or changed business behavior was implemented before its required failing test, stop and
  report the TDD violation. For a behavior-preserving refactor, require baseline and post-refactor
  test evidence instead. Do not claim TDD compliance or delete source code without approval.
- **Fast feedback during TDD is OK; final claims are not.**
    - During the RED→GREEN→REFACTOR cycle of a single task, it is fine to run a single test file
      or `--tests 'pattern'` for speed and signal.
    - However, to mark `apply_outcome=PASS` in `state.yaml` or to claim "tests green" in your
      return summary, you MUST have run the BROADER task invocation at least once without a
      `--tests` filter (e.g. the full module's `test` / `postgresIntegrationTest` task, or the
      justfile recipe such as `just backend-test-fast` / `just backend-test-postgres`). Filtered
      runs hide regressions like JVM class-name collisions, Spring context wiring conflicts, and
      bean duplicate-registration errors that only surface during full classpath scans.
    - The full (unfiltered) invocation MUST be listed by name in `apply-progress.md` under
      "Commands Run" with its exit code and test counts. If you did not run it, do not claim
      green.
- Return envelope per **Section D** from `../_shared/sdd-phase-common.md`.
