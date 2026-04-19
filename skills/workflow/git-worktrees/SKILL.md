---
name: git-worktrees
description: Use when working on multiple branches in parallel from the same repository, or when creating, switching, cleaning up, or validating Git worktrees safely.
---

# Git Worktrees

## Overview

`git worktree` lets one repository support multiple active working directories safely. Use it to
split parallel work without stashing, recloning, or mixing branch state.

**Standard convention:**
- branch: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`
- directory: `../worktrees/<slug>`
- slug: short, kebab-case, purpose-first

## When to Use

- Working on multiple features or fixes in parallel
- Keeping urgent fixes isolated from a larger in-flight branch
- Reviewing or testing a branch without disturbing the current working directory
- Needing a clean, dedicated directory per branch

Do **not** use worktrees for tiny one-file edits when a normal branch in the current directory is
enough.

## Core Pattern

### Create a new worktree

1. Confirm the repository root and current branch
2. Pick a short purpose-first slug
3. Create the worktree in `../worktrees/<slug>`
4. Enter the worktree and verify the branch before editing

```bash
git rev-parse --show-toplevel
git branch --show-current
mkdir -p ../worktrees
git worktree add ../worktrees/auth-session -b feature/auth-session
cd ../worktrees/auth-session
git branch --show-current
```

### Work safely inside the worktree

- Before editing, staging, committing, or pushing, verify the branch:

```bash
git branch --show-current
git status
```

- If the branch has no upstream yet:

```bash
git push -u origin feature/auth-session
```

### Clean up after merge or abandonment

```bash
git worktree list
git status
git worktree remove ../worktrees/auth-session
git worktree prune
```

If the branch is done and no longer needed:

```bash
git branch -d feature/auth-session
```

## Quick Reference

| Task | Command |
|---|---|
| List worktrees | `git worktree list` |
| Create worktree with new branch | `git worktree add ../worktrees/<slug> -b feature/<slug>` |
| Create from existing branch | `git worktree add ../worktrees/<slug> <branch>` |
| Show repo root | `git rev-parse --show-toplevel` |
| Show current branch | `git branch --show-current` |
| Remove worktree | `git worktree remove ../worktrees/<slug>` |
| Prune stale metadata | `git worktree prune` |

## Common Mistakes

| Mistake | Fix |
|---|---|
| Editing in the wrong directory | Run `git rev-parse --show-toplevel` and `git branch --show-current` first |
| Inconsistent worktree names | Always use `../worktrees/<slug>` with kebab-case slugs |
| Mixing root repo and worktree changes | Treat each worktree as a separate active workspace |
| Removing a worktree with uncommitted work | Check `git status` before `git worktree remove` |
| Leaving stale metadata behind | Run `git worktree prune` after removals |
| Creating from the wrong base branch | Verify current branch before `git worktree add` |

## Decision Rules

- Use `feature/<slug>` for net-new functionality
- Use `fix/<slug>` for bug fixes
- Use `chore/<slug>` for maintenance work
- Keep the directory name just the slug, not the branch prefix
- Prefer one worktree per active branch

## Safety Rule

Before any meaningful change in a multi-worktree repo, verify both:

```bash
git rev-parse --show-toplevel
git branch --show-current
```

If either looks wrong, stop and reorient before editing.
