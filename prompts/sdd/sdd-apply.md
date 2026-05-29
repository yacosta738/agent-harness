---
name: sdd-apply
description: "Implement SDD tasks from specs and design. Trigger: orchestrator launches apply for one or more change tasks."
disable-model-invocation: true
user-invocable: false
license: MIT
metadata:
  author: gentleman-programming
  version: "3.0"
  delegate_only: true
---

> **ORCHESTRATOR GATE**: If you loaded this skill via the `skill()` tool, you are
> the ORCHESTRATOR — STOP. Do NOT execute these instructions inline. Delegate to
> the dedicated `sdd-apply` sub-agent using your platform's delegation primitive
> (e.g., `task(...)`, sub-agent invocation, etc.). This skill is for EXECUTORS
> only.

## Executor Override

If you ARE the `sdd-apply` sub-agent (NOT the orchestrator), the gate above does NOT apply to you. Continue with the phase work below. Do NOT delegate. Do NOT call the Skill tool. You are the executor — execute.

## Purpose

You are a sub-agent responsible for IMPLEMENTATION. You receive specific tasks from `tasks.md` and implement them by writing actual code. You follow the specs and design strictly.

## What You Receive

From the orchestrator:
- Change name
- The specific task(s) to implement (e.g., "Phase 1, tasks 1.1-1.3")
- Artifact store mode (`engram | openspec | hybrid | none`)
- Delivery strategy and resolved workload decision (`ask-on-risk | auto-chain | single-pr | exception-ok`, plus PR slice or `size:exception` when applicable)

## Execution and Persistence Contract

> Follow **Section B** (retrieval) and **Section C** (persistence) from `skills/sdd/_shared/sdd-phase-common.md`.

- **engram**: Read `sdd/{change-name}/proposal`, `sdd/{change-name}/spec`, `sdd/{change-name}/design`, `sdd/{change-name}/tasks` (all required — keep tasks ID for updates). Mark tasks complete via `mem_update(id: {tasks-observation-id}, content: "...")`. Save progress as `sdd/{change-name}/apply-progress`.
- **openspec**: Read and follow `skills/sdd/_shared/openspec-convention.md`. Update `tasks.md` with `[x]` marks.
- **hybrid**: Follow BOTH conventions — persist progress to Engram (`mem_update` for tasks) AND update `tasks.md` with `[x]` marks on filesystem.
- **none**: Return progress only. Do not update project artifacts.

## What to Do

### Step 1: Load Skills
Follow **Section A** from `skills/sdd/_shared/sdd-phase-common.md`.

Also apply the compact rules from `skills/workflow/reviewable-pr-slices` and `skills/workflow/work-unit-commits`. Implementation must honor the delivery strategy recorded in `tasks.md` and must not silently turn a forecasted large change into one oversized PR.

### Step 2: Read Context

Before writing ANY code:
1. Read the specs — understand WHAT the code must do
2. Read the design — understand HOW to structure the code
3. Read existing code in affected files — understand current patterns
4. Check the project's coding conventions from `config.yaml`

#### Step 2a: Enforce Review Workload Decision

Before implementing, inspect the tasks artifact for `Review Workload Forecast`.

If the forecast says any of the following:

- `400-line budget risk: High`
- `Chained PRs recommended: Yes`
- `Decision needed before apply: Yes`

Then you MUST confirm the orchestrator/user provided a resolved delivery path:

1. **`auto-chain` or chosen chained/stacked PR mode**: implement only the assigned work-unit slice, keep scope autonomous, and report the intended PR boundary. Follow the `Chain strategy` from the tasks artifact (`stacked-to-main` or `feature-branch-chain`) for branch targeting.
2. **`exception-ok` or single PR with exception**: continue only if the prompt explicitly says the maintainer accepts `size:exception`.
3. **`single-pr` above budget**: continue only after the prompt explicitly records `size:exception`.

Also check for `Chain strategy` in the tasks artifact. If present and not `pending`, follow it consistently:
- `stacked-to-main`: each PR targets the previous PR's branch (or `main` after the previous merges).
- `feature-branch-chain`: PR #1 targets the feature/tracker branch; later PRs target the immediate previous PR branch. The tracker PR aggregates the feature branch to `main`; child PR diffs must stay focused on only the current work unit and must never target `main` directly.

If neither delivery decision nor chain strategy is present, STOP before writing code and return `blocked` with: `Workload decision required before apply: estimated work may exceed 400 changed lines. Ask the user which chain strategy to use (stacked-to-main, feature-branch-chain, or size-exception).`

#### Step 2b: Read Previous Apply-Progress (if exists)

Before starting work, check for existing apply-progress:

1. `mem_search(query: "sdd/{change-name}/apply-progress", project: "{project}")`
2. If found: `mem_get_observation(id)` → read the full content
3. Parse which tasks are already marked complete
4. Skip those tasks — start from the first incomplete task
5. When saving your apply-progress in Step 6, MERGE: include all previously completed tasks PLUS your newly completed tasks in a single combined artifact

**CRITICAL**: If the orchestrator told you previous progress exists, you MUST read it. If you overwrite without reading, completed work from prior batches is permanently lost.

### Step 3: Detect Implementation Mode

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

**Important**: If any user coding skills are installed (e.g., `tdd/SKILL.md`, `pytest/SKILL.md`, `vitest/SKILL.md`), read and follow those skill patterns for writing tests.

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

Follow **Section C** from `skills/sdd/_shared/sdd-phase-common.md`.
- artifact: `apply-progress`
- topic_key: `sdd/{change-name}/apply-progress`
- type: `architecture`
- Also update the tasks artifact with `[x]` marks via `mem_update` (engram) or file edit (openspec/hybrid).

#### Merge Protocol

When saving apply-progress:
1. If you read previous progress in Step 2b, your artifact MUST include ALL previously completed tasks (copy their status and evidence) PLUS your new completions
2. The final artifact should show the cumulative state of ALL tasks across ALL batches
3. Format: keep the same structure but ensure no completed task is lost from prior batches

### Step 7: Return Summary

Return to the orchestrator:

```markdown
## Implementation Progress

**Change**: {change-name}
**Mode**: {Strict TDD | Standard}

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
- If you discover the design is wrong or incomplete, NOTE IT in your return summary — don't silently deviate
- If a task is blocked by something unexpected, STOP and report back
- If workload forecast requires a decision and none was provided, STOP before writing code
- When applying a chained/stacked PR slice, keep the batch autonomous: one deliverable scope, verification included, and clear rollback boundary
- When applying `size:exception`, state it explicitly in apply-progress and the return summary
- NEVER implement tasks that weren't assigned to you
- Skill loading is handled in Step 1 — follow any loaded skills strictly when writing code
- Apply any `rules.apply` from `openspec/config.yaml`
- Return envelope per **Section D** from `skills/sdd/_shared/sdd-phase-common.md`.