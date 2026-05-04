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
- The specific task(s) to implement (e.g., "Phase 1, tasks 1.1-1.3")
- Artifact store mode (`openspec`)

## Execution and Persistence Contract

> Follow **Section B** (retrieval) and **Section C** (persistence) from
`../_shared/sdd-phase-common.md`.

- **openspec**: Read and follow `../_shared/openspec-convention.md`. Update `tasks.md` with `[x]`
  marks.

## What to Do

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

- If forecast is **High** and the delivery strategy is `stacked-prs` or `feature-branch-chain`,
  implement only the user-approved slice or assigned task batch.
- If forecast is **High** and the delivery strategy is `size-exception-needed`, STOP unless the
  prompt or tasks explicitly records that the user/maintainer approved the exception.
- If forecast is **High** but no delivery strategy has been approved, STOP and return
  `status: blocked`; ask the orchestrator to get the user's choice.
- If the assigned batch no longer looks reviewable because implementation will likely exceed the
  budget, STOP and report the need to rebalance slices.
- Keep code, tests, and docs together by work unit. Do not implement all code first and leave
  tests/docs for a later unrelated batch.

### Step 4: Detect Implementation Mode

Before writing code, determine if the project uses TDD:

```
Detect TDD mode from (in priority order):
├── openspec/config.yaml → rules.apply.tdd (true/false — highest priority)
├── User's installed skills (e.g., tdd/SKILL.md exists)
├── Existing test patterns in the codebase (test files alongside source)
└── Default: standard mode (write code first, then verify)

IF TDD mode is detected → use TDD Workflow
IF standard mode → use Standard Workflow
```

### Step 4a: Implement Tasks (TDD Workflow — RED → GREEN → REFACTOR)

When TDD is active, EVERY task follows this cycle:

```
FOR EACH TASK:
├── 1. UNDERSTAND
│   ├── Read the task description
│   ├── Read relevant spec scenarios (these are your acceptance criteria)
│   ├── Read the design decisions (these constrain your approach)
│   └── Read existing code and test patterns
│
├── 2. RED — Write a failing test FIRST
│   ├── Write test(s) that describe the expected behavior from the spec scenarios
│   ├── Run tests — confirm they FAIL (this proves the test is meaningful)
│   └── If test passes immediately → the behavior already exists or the test is wrong
│
├── 3. GREEN — Write the minimum code to pass
│   ├── Implement ONLY what's needed to make the failing test(s) pass
│   ├── Run tests — confirm they PASS
│   └── Do NOT add extra functionality beyond what the test requires
│
├── 4. REFACTOR — Clean up without changing behavior
│   ├── Improve code structure, naming, duplication
│   ├── Run tests again — confirm they STILL PASS
│   └── Match project conventions and patterns
│
├── 5. Mark task as complete [x] in tasks.md
└── 6. Note any issues or deviations
```

Detect the test runner for execution:

```
Detect test runner from:
├── openspec/config.yaml → rules.apply.test_command (highest priority)
├── package.json → scripts.test
├── pyproject.toml / pytest.ini → pytest
├── Makefile → make test
└── Fallback: report that tests couldn't be run automatically
```

**Important**: If any user coding skills are installed (e.g., `tdd/SKILL.md`, `pytest/SKILL.md`,
`vitest/SKILL.md`), read and follow those skill patterns for writing tests.

### Step 4b: Implement Tasks (Standard Workflow)

When TDD is not active:

```
FOR EACH TASK:
├── Read the task description
├── Read relevant spec scenarios (these are your acceptance criteria)
├── Read the design decisions (these constrain your approach)
├── Read existing code patterns (match the project's style)
├── Write the code
├── Mark task as complete [x] in tasks.md
└── Note any issues or deviations
```

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

**Change**: {change-name}
**Mode**: {TDD | Standard}

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
- **Delivery strategy**: {single-pr | stacked-prs | feature-branch-chain | size-exception | not set}
- **Implemented slice/batch**: {scope implemented}
- **Budget concern**: {None | Needs rebalance | Needs user decision}

### Tests (TDD mode only)
| Task | Test File | RED (fail) | GREEN (pass) | REFACTOR |
|------|-----------|------------|--------------|----------|
| 1.1 | `path/to/test.ext` | ✅ Failed as expected | ✅ Passed | ✅ Clean |
| 1.2 | `path/to/test.ext` | ✅ Failed as expected | ✅ Passed | ✅ Clean |

{Omit this section if standard mode was used.}

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
- Load and follow any relevant coding skills for the project stack (e.g., react-19, typescript,
  django-drf, tdd, pytest, vitest) if available in the user's skill set
- Apply any `rules.apply` from `openspec/config.yaml`
- Keep implementation batches aligned with work-unit commits: behavior, tests, and docs stay
  together
- If TDD mode is detected (Step 4), ALWAYS follow the RED → GREEN → REFACTOR cycle — never skip
  RED (writing the failing test first)
- When running tests during TDD, run ONLY the relevant test file/suite, not the entire test suite (
  for speed)
- Return envelope per **Section D** from `../_shared/sdd-phase-common.md`.
