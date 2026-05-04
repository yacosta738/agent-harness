---
name: reviewable-pr-slices
description: Use when a change or pull request may be too large to review comfortably, when planning stacked PRs, chained PRs, tracker PRs, or size exceptions.
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

With this skill, the agent detects review-budget risk before publishing and asks whether to use
stacked PRs, a feature branch chain, or an explicit size exception.

## When to Use

Use when:

- A PR or planned change approaches or exceeds the review budget. Treat roughly 300+ changed lines,
  or any uncertain multi-surface diff, as approaching the default 400-line budget.
- SDD tasks or an implementation plan forecast a large diff.
- A reviewer asks to split a PR.
- Work needs stacked PRs, chained PRs, or a tracker PR.

Do not use for tiny, single-purpose changes comfortably under budget.

## Hard Rules

| Rule                  | Requirement                                                                      |
|-----------------------|----------------------------------------------------------------------------------|
| Forecast early        | During SDD task planning, estimate review workload before implementation starts. |
| Budget check          | Check changed lines before opening or marking a PR ready.                        |
| Autonomous slices     | Each PR has one deliverable scope, verification, and reasonable rollback.        |
| Work-unit balance     | Balance slices around deliverable work units, not file types or phases alone.    |
| Explicit boundaries   | State start, end, dependencies, follow-up, and out-of-scope work.                |
| One strategy          | Do not mix stacked PRs and feature-branch tracker patterns in one chain.         |
| Exception is explicit | Use a size exception only with user or maintainer approval and rationale.        |

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
| Proposed slice strategy | single-pr / stacked-prs / feature-branch-chain / size-exception-needed |
| Work-unit balance | <brief explanation of how tasks map to reviewable work units> |
```

Use this heuristic:

| Risk   | Signal                                                                           | Action                                              |
|--------|----------------------------------------------------------------------------------|-----------------------------------------------------|
| Low    | Small, single-surface change                                                     | Keep one PR with work-unit commits.                 |
| Medium | Multi-file or uncertain diff, likely 300-400 changed lines                       | Warn and keep commits slice-ready.                  |
| High   | Multi-surface change, migrations, broad tests/docs, or likely >400 changed lines | Stop before `sdd-apply` and ask for chain strategy. |

During `sdd-apply`, implement only the approved slice or task batch. If implementation grows beyond
the forecast, stop and report that the review budget needs a new split decision.

## Strategy Choice

When over budget or forecast as High risk, ask the user to choose:

```text
This SDD change may exceed the 400-line review budget. How do you want to deliver it?

1. Stacked PRs balanced by work-unit commits
   First slice targets the base branch; each later slice targets the previous slice branch. Faster, but partial work may reach the base branch as slices land.

2. Feature branch chain with tracker PR, balanced by work-unit commits
   Child PRs target an integration branch. Safer integration, more branch management.

3. Size exception
   Keep one PR with documented rationale.
```

Stop after asking. Do not assume.

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

- Use `sdd-tasks` to forecast workload and record the recommended delivery strategy.
- Use `sdd-apply` to implement only the approved slice or batch, not the whole change by inertia.
- Use `work-unit-commits` to form balanced slices before PR creation.
- Use `pr-creator` to preserve repository templates.
- Use `yeet` only after scope and branch strategy are confirmed.
