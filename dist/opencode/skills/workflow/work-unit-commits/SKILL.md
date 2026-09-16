---
name: work-unit-commits
description: Use when preparing commits, staging changes, splitting review work, or deciding commit and pull request boundaries.
---

# Work Unit Commits

## Overview

Commit by deliverable work unit, not by file type. A good commit leaves the repository in a coherent
state and tells a reviewer one clear story.

## Pressure Scenario

Without this skill, an agent preparing commits for a feature that touches domain code, UI, tests,
and docs tends to create horizontal commits like `models`, `services`, `tests`, and `docs`. That
makes review and rollback harder because no commit proves a complete behavior.

With this skill, the agent groups code, tests, and docs by the behavior or fix they deliver.

## When to Use

Use when:

- Preparing one or more commits.
- Splitting a large change into reviewable pieces.
- Applying an implementation plan or SDD task list.
- Deciding whether tests/docs belong with a code change.

Do not use this to justify committing without explicit user request. Commit safety rules still
apply.

## Core Rules

| Rule                           | Requirement                                                                                  |
|--------------------------------|----------------------------------------------------------------------------------------------|
| Commit by work unit            | One commit delivers one behavior, fix, migration, refactor, or docs unit.                    |
| Stack layer coherence          | For `github-stacked-prs`, one work-unit commit belongs to one dependency-ordered layer.       |
| Do not commit by file type     | Avoid separate `models`, `services`, `tests`, `docs` commits when none stands alone.           |
| Keep tests with code           | Tests belong in the same commit as the behavior they verify.                                 |
| Keep docs with visible changes | User-facing docs belong with the feature or workflow they explain.                            |
| Preserve rollback              | Reverting the commit should not remove unrelated work.                                       |
| No stack mechanics here        | Do not initialize, link, sync, rebase, or merge a Stack; hand those operations to GitHub skill. |
| Tell the why                   | The commit message explains the outcome, not the file list.                                  |

## Quick Check

Before staging or committing, confirm:

- [ ] This unit has one clear purpose.
- [ ] The repo still makes sense after applying only this unit.
- [ ] Tests or docs for this unit are included when relevant.
- [ ] No unrelated user changes are staged.
- [ ] The message uses the repository's commit style.

## Better Splits

| Weak split     | Better work-unit split                         |
|----------------|------------------------------------------------|
| `add models`   | `feat(auth): validate tokens with tests`       |
| `add services` | `feat(auth): wire token validation into login` |
| `add tests`    | Tests included beside each behavior commit     |
| `update docs`  | Docs included with the user-visible change     |

## Related Skills

- Use `test-driven-development` when the work changes behavior.
- Use `reviewable-pr-slices` when a group of work units may exceed the review budget.
- Use `github-stacked-prs` for GitHub Stack topology and publication mechanics.
- Use `yeet` only when the user wants to publish local changes.
