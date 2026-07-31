---
name: sdd-tasks
description: >
  Break down a change into an implementation task checklist.
  Trigger: When the orchestrator launches you to create or update the task breakdown for a change.
license: MIT
metadata:
  author: acosta
  version: "2.0"
---

## Purpose

You are a sub-agent responsible for creating the TASK BREAKDOWN. You take the proposal, specs, and
design, then produce a `tasks.md` with concrete, actionable implementation steps organized by phase.

## What You Receive

From the orchestrator:

- Change name
- Artifact store mode (`openspec`)

## Execution and Persistence Contract

> Follow **Section B** (retrieval) and **Section C** (persistence) from
`../_shared/sdd-phase-common.md`.

- **openspec**: Read and follow `../_shared/openspec-convention.md`.

## What to Do

### Step 1: Load Skills

Follow **Section A** from `../_shared/sdd-phase-common.md`.

Also apply the compact rules from `reviewable-pr-slices` and `work-unit-commits` when breaking down
implementation work. SDD task planning must forecast review workload before any `sdd-apply`
implementation starts.

### Step 2: Analyze the Design

From the design document, identify:

- All files that need to be created/modified/deleted
- The dependency order (what must come first)
- Testing requirements per component

### Step 3: Write tasks.md

Create the task file:

```
openspec/changes/{change-name}/
├── proposal.md
├── specs/
├── design.md
└── tasks.md               ← You create this
```

#### Task File Format

```markdown
# Tasks: {Change Title}

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Review budget | 400 changed lines unless project config says otherwise |
| Estimated workload | Low / Medium / High |
| Chained PRs recommended | Yes / No |
| Chain strategy | github-stacked-prs / feature-branch-chain / single-pr / size-exception |
| Work-unit balance | <how tasks map to dependency-ordered reviewable layers> |

## Phase 1: {Phase Name} (e.g., Infrastructure / Foundation)

- [ ] 1.1 {Concrete action — what file, what change}
- [ ] 1.2 {Concrete action}
- [ ] 1.3 {Concrete action}

## Phase 2: {Phase Name} (e.g., Core Implementation)

Each implementation task is split into RED→GREEN→REFACTOR per TDD:

- [ ] 2.1 RED: Write failing test for {component/behavior}
- [ ] 2.2 GREEN: Implement minimum code to pass
- [ ] 2.3 REFACTOR: Clean up, verify tests still pass
- [ ] 2.4 RED: Write failing test for {next behavior}
- [ ] 2.5 GREEN: Implement minimum code to pass
- [ ] 2.6 REFACTOR: Clean up, verify tests still pass

## Phase 3: {Phase Name} (e.g., Integration / E2E Testing)

- [ ] 3.1 RED: Write failing integration test for {scenario}
- [ ] 3.2 GREEN: Wire components to pass
- [ ] 3.3 REFACTOR: Clean up wiring

## Phase 4: {Phase Name} (e.g., Cleanup / Documentation)

- [ ] 4.1 {Update docs/comments}
- [ ] 4.2 {Remove temporary code}
```

### Review Workload Forecast Rules

Before writing phases, estimate the implementation review load from the design's file changes,
specs, testing scope, migrations, docs, and expected integration surface.

Use this heuristic:

| Risk   | Signal                                                                           | Required action                                                                                                                   |
|--------|----------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Low    | Small, single-surface change                                                     | `single-pr`; keep work-unit commits.                                                                                              |
| Medium | Multi-file or uncertain diff, likely 300-400 changed lines                       | `single-pr`; warn that commits must stay slice-ready.                                                                             |
| High   | Multi-surface change, migrations, broad tests/docs, or likely >400 changed lines | `github-stacked-prs`, `feature-branch-chain`, or approved `size-exception`; record a dependency-ordered layer boundary before `sdd-apply`. |

Balance proposed slices by deliverable work units: each slice should include behavior, tests, and
docs needed to review it. Do not balance by horizontal layers like "models", "routes", "tests"
unless that layer is itself a complete deliverable.

### Task Writing Rules

Each task MUST be:

| Criteria        | Example ✅                                                  | Anti-example ❌          |
|-----------------|------------------------------------------------------------|-------------------------|
| **Specific**    | "Create `internal/auth/middleware.go` with JWT validation" | "Add auth"              |
| **Actionable**  | "Add `ValidateToken()` method to `AuthService`"            | "Handle tokens"         |
| **Verifiable**  | "Test: `POST /login` returns 401 without token"            | "Make sure it works"    |
| **Small**       | One file or one logical unit of work                       | "Implement the feature" |
| **TDD-split**   | Split into RED→GREEN→REFACTOR per behavior                 | Bundle test + impl together |

### Phase Organization Guidelines

```
Phase 1: Foundation / Infrastructure
  └─ New types, interfaces, database changes, config
  └─ Things other tasks depend on

Phase 2: Core Implementation
  └─ Main logic, business rules, core behavior
  └─ The meat of the change

Phase 3: Integration / Wiring
  └─ Connect components, routes, UI wiring
  └─ Make everything work together

Phase 4: Testing
  └─ RED tasks: write failing tests first
  └─ Unit tests, integration tests, e2e tests
  └─ Verify against spec scenarios

Phase 5: Cleanup (if needed)
  └─ Documentation, remove dead code, polish
```

### Step 4: Persist Artifact

**This step is MANDATORY — do NOT skip it.**

Follow **Section C** from `../_shared/sdd-phase-common.md`. Write to
`openspec/changes/{change-name}/tasks.md`.

### Step 5: Return Summary

Return to the orchestrator:

```markdown
## Tasks Created

**Change**: {change-name}
**Location**: openspec/changes/{change-name}/tasks.md

### Breakdown
| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | {N} | {Phase name} |
| Phase 2 | {N} | {Phase name} |
| Phase 3 | {N} | {Phase name} |
| Total | {N} | |

### Review Workload Forecast
- **Budget**: {budget} changed lines
- **Estimated workload**: {Low | Medium | High}
- **Chained PRs recommended**: {Yes | No}
- **Chain strategy**: {github-stacked-prs | feature-branch-chain | single-pr | size-exception}
- **Work-unit balance**: {brief rationale}

### Implementation Order
{Brief description of the recommended order and why}

### Next Step
{Ready for implementation (sdd-apply) | Blocked until user chooses stacked PRs, feature branch chain, or size exception.}
```

## Rules

- ALWAYS reference concrete file paths in tasks
- Tasks MUST be ordered by dependency — Phase 1 tasks shouldn't depend on Phase 2
- Testing tasks should reference specific scenarios from the specs
- Each task should be completable in ONE session (if a task feels too big, split it)
- Tasks MUST be grouped into dependency-ordered work-unit layers so they can become coherent commits or PR slices if review workload is High
- For `github-stacked-prs`, every layer MUST record `trunk`, `parent_branch`, `base`, `branch`, `position`, and issue/Linear metadata when available; only the bottom layer targets the trunk
- For `feature-branch-chain`, record its separately approved integration/tracker base; never substitute GitHub Stack metadata
- A `size-exception` MUST state the explicit approval and rationale before apply
- Use hierarchical numbering: 1.1, 1.2, 2.1, 2.2, etc.
- NEVER include vague tasks like "implement feature" or "add tests"
- Apply any `rules.tasks` from `openspec/config.yaml`
- TDD IS MANDATORY. Each implementation task MUST be split into:
  - RED task: write the failing test FIRST
  - GREEN task: write minimum code to pass
  - REFACTOR task: clean up without changing behavior
  Do NOT bundle implementation and testing into a single task — that hides the TDD cycle.
- **Size budget**: Tasks artifact SHOULD stay under 650 words including the Review Workload
  Forecast. Each task: 1-2 lines max. Use checklist format, not paragraphs.
- Return envelope per **Section D** from `../_shared/sdd-phase-common.md`.
