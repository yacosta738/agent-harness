---
name: reviewable-pr-slices
description: Use when a change or pull request may be too large to review comfortably, when planning GitHub Stacked PRs, feature-branch chains, single PRs, or size exceptions.
---

# Reviewable PR Slices

## Overview

Protect reviewer attention by splitting large changes into autonomous, verifiable PR slices. Default
review budget: **400 changed lines** (`additions + deletions`) unless the repository defines another
limit. Count all changed lines for the budget; if generated files, lockfiles, snapshots, or vendored
code dominate the diff, report them separately but do not hide them.

## Pressure Scenario

Without this skill, an agent opens one large PR with 900 changed lines because the code is complete
and tests pass. Reviewers then skim, miss defects, or ask for a late split.

With this skill, the agent detects review-budget risk before publishing and selects exactly one
canonical strategy: `github-stacked-prs`, `feature-branch-chain`, `single-pr`, or `size-exception`.

## When to Use

Use when:

- A PR or planned change approaches or exceeds the review budget. Treat roughly 300+ changed lines,
  or any uncertain multi-surface diff, as approaching the default 400-line budget.
- SDD tasks or an implementation plan forecast a large diff.
- A reviewer asks to split a PR.
- Work needs GitHub Stacked PRs or the separate `feature-branch-chain` tracker workflow.

Do not use for tiny, single-purpose changes comfortably under budget.

## Hard Rules

| Rule                  | Requirement                                                                      |
|-----------------------|----------------------------------------------------------------------------------|
| Forecast early        | During SDD task planning, estimate review workload before implementation starts. |
| Budget check          | Check changed lines before opening or marking a PR ready.                        |
| Autonomous slices     | Each PR has one deliverable scope, verification, and reasonable rollback.        |
| Work-unit balance     | Balance slices around deliverable work units, not file types or phases alone.    |
| Explicit boundaries   | State start, end, dependencies, follow-up, and out-of-scope work.                |
| Canonical strategy     | Choose exactly `github-stacked-prs`, `feature-branch-chain`, `single-pr`, or `size-exception`. |
| One strategy           | Do not mix GitHub Stack state and feature-branch tracker patterns in one chain.          |
| Exception is explicit  | Use `size-exception` only with user or maintainer approval and rationale.                  |

## SDD Integration

This skill is a planning gate in SDD, not only a PR cleanup tool.

During `sdd-tasks`, add a **Review Workload Forecast** to `tasks.md`:

```markdown
## Review Workload Forecast

| Field | Value |
|-------|-------|
| Review budget | 400 changed lines |
| Estimated workload | Low / Medium / High |
| Chained PRs recommended | Yes / No |
| Chain strategy | github-stacked-prs / feature-branch-chain / single-pr / size-exception |
| Work-unit balance | <how each deliverable maps to one reviewable layer> |
```

Use this heuristic:

| Risk   | Signal                                                                           | Action                                              |
|--------|----------------------------------------------------------------------------------|-----------------------------------------------------|
| Low    | Small, single-surface change                                                     | Keep one PR with work-unit commits.                 |
| Medium | Multi-file or uncertain diff, likely 300-400 changed lines                       | Warn and keep commits slice-ready.                  |
| High   | Multi-surface change, migrations, broad tests/docs, or likely >400 changed lines | Stop before `sdd-apply` and require `github-stacked-prs`, `feature-branch-chain`, or approved `size-exception`. |

During `sdd-apply`, implement only the approved slice or task batch. If implementation grows beyond
the forecast, stop and report that the review budget needs a new split decision.

## Strategy Choice

When over budget or forecast as High risk, require one explicit canonical strategy:

```text
This SDD change may exceed the 400-line review budget. Choose one:

1. github-stacked-prs
   GitHub Stack state; bottom PR targets the trunk and each child targets the immediately lower branch.

2. feature-branch-chain
   Separate integration/tracker branch; child PRs target the previous work-unit branch and never use GitHub Stack metadata.

3. single-pr
   One ordinary PR only when the diff is within budget.

4. size-exception
   One over-budget PR with explicit user/maintainer approval and documented rationale.
```

Do not interpret `stacked-prs` or `stacked-to-main`; stop and require `sdd-tasks` regeneration.

## Chain Context for PR Bodies

Add this section without replacing the repository PR template:

````markdown
## Chain Context

| Field | Value |
|-------|-------|
| Chain | <name> |
| Position | <N of total> |
| Base | `<target branch>` |
| Depends on | <PR/issue/link or "None"> |
| Follow-up | <next PR or "None"> |
| Review budget | <changed lines> / <budget> |
| Starts at | <state this builds on> |
| Ends with | <standalone result delivered> |

### Chain Overview

```text
main
 └── #NNN Previous
      └── [current] #NNN This PR
           └── #NNN Next
```
````

## Integration Points

- Use `sdd-tasks` to forecast workload, record dependency layers, and record the canonical strategy.
- Use `sdd-apply` to implement only the assigned layer, or the full approved `size-exception` unit.
- Use `work-unit-commits` to keep each layer coherent before PR creation.
- Use `github-stacked-prs` for GitHub Stack mechanics; this skill does not own `gh stack`.
- Use `pr-creator` to preserve repository templates and per-layer metadata.
- Use `yeet` only after scope, authorization, and branch strategy are confirmed.
