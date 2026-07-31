---
name: "yeet"
description: Use when the user explicitly asks to publish local changes to GitHub end-to-end, including commit, push, and draft PR creation.
---

# GitHub Publish Changes

## Overview

Use this skill only when the user explicitly wants the full publish flow from the local checkout:
branch setup if needed, staging, commit, push, and opening a pull request.

This workflow uses local Git and GitHub CLI:

- Use local `git` for branch creation, staging, commit, and push.
- Use `gh` for GitHub PR discovery, auth checks, metadata, and PR creation.

## Prerequisites

- Require GitHub CLI `gh`. Check `gh --version`. If missing, ask the user to install `gh` and stop.
- Require authenticated `gh` session. Run `gh auth status`. If not authenticated, ask the user to
  run `gh auth login` (and re-run `gh auth status`) before continuing.
- Require a local git repository with a clean understanding of which changes belong in the PR.

## Naming conventions

- Branch: semantic prefix plus short slug, for example `feat/cloudflare-skills`, `fix/sentry-path`,
  or `chore/github-skill-cleanup`.
- Commit: Conventional Commits, for example `feat: add Cloudflare skills integration`.
- PR title: semantic title matching the change intent, for example
  `feat: add Cloudflare skills integration` or `fix: correct Sentry skill script path`.

## Related Skills

- Use `work-unit-commits` before staging when the worktree contains multiple behaviors, tests, or
  docs.
- Use `reviewable-pr-slices` before pushing/opening a PR when the diff may approach or exceed the
  review budget, default 400 changed lines.
- Use `github-stacked-prs` when the approved strategy is `github-stacked-prs`; it owns Stack detection,
  topology, push/link/sync/rebase/merge mechanics. `yeet` retains authorization and scope checks.
- Preserve `feature-branch-chain` as a separate workflow; do not invoke `gh stack` for it.
- Use `cognitive-doc-design` when drafting a non-trivial PR body.

## Workflow

### Stack handoff

If `chain_strategy` is `github-stacked-prs`, first hand off to `github-stacked-prs` for detection-only
preflight and layer validation. Do not stage, commit, push, rebase, or create a PR until it reports
that `gh >= 2.90`, `github/gh-stack`, authentication, clean state, one repository/remote, linear
history, and unambiguous Stack/PR state are ready. Missing prerequisites produce these manual
commands and a stop; `yeet` never installs them:

```bash
brew install gh
# or install GitHub CLI using https://cli.github.com/
gh extension install github/gh-stack
# optional official agent guidance:
gh skill install github/gh-stack
```

After preflight, `yeet` still requires explicit authorization for staging, commit, push, and PR
creation. Use `gh stack push` for an authorized Stack push, then let `pr-creator` create template-
compliant per-layer PRs and `gh stack link` them. Never use `gh stack submit` by default because its
interactive/editor path can bypass repository-specific templates; use it only as an explicitly
verified escape hatch.

1. Confirm intended scope.

- Run `git status -sb` and inspect the diff before staging.
- If the working tree contains unrelated changes, do not default to `git add -A`. Ask the user
  which files belong in the PR.

2. Determine the branch strategy.

- If on `main`, `master`, or another default branch, create a semantic branch such as
  `feat/{description}`, `fix/{description}`, or `chore/{description}`.
- Otherwise inspect upstream/remote status for the current branch. If it already tracks a remote
  branch that may contain shared work, ask before committing or pushing to it.

3. Stage only the intended changes.

- Prefer explicit file paths when the worktree is mixed.
- Use `git add -A` only when the user has confirmed the whole worktree belongs in scope.
- Stage by deliverable work unit, not by file type. Keep tests and docs beside the behavior they
  verify or explain.

4. Commit with a Conventional Commit message aligned to the branch and PR intent.
5. Run the most relevant checks available if they have not already been run.

- If checks fail due to missing dependencies or tools, report the missing requirement and ask before
  installing anything that changes the environment, global tools, or lockfiles.

6. Check review budget before publishing.

- Determine the PR base branch from the user request when specified; otherwise use the remote
  default branch, for example via `gh repo view --json defaultBranchRef`.
- Fetch or otherwise resolve the remote base branch before measuring.
- Inspect changed lines against the remote PR base, for example
  `git diff --shortstat origin/<base>...HEAD`, or use trusted PR metadata if the branch already
  exists remotely.
- If the PR approaches or exceeds the repository budget, default 400 changed lines, stop, load
  `reviewable-pr-slices`, and require one canonical strategy: `github-stacked-prs`,
  `feature-branch-chain`, or explicitly approved `size-exception`.
- Never use the ambiguous legacy values `stacked-prs` or `stacked-to-main` as strategy values.

7. Push with tracking: `git push -u origin "$(git branch --show-current)"`.
8. Open a draft PR.

- Use `gh pr create --draft` for PR creation after the push succeeds unless the user explicitly
  requested ready-for-review.
- Use a semantic PR title matching the Conventional Commit style used for the change.
- Derive the repository from the remote, for example with `gh repo view --json nameWithOwner`.
- Derive `head_branch` from `git branch --show-current`.
- Write the PR body to a temp file with real newlines so the markdown renders cleanly.

9. Summarize the result with branch name, commit, PR target, validation, review-budget status, and
   anything the user still
   needs to confirm.

## Write Safety

- Never stage unrelated user changes silently.
- Never push without confirming scope when the worktree is mixed.
- Default to a draft PR unless the user explicitly asks for a ready-for-review PR.
- If the repository does not appear to be connected to an accessible GitHub remote, stop and explain
  the blocker before making assumptions.

## PR Body Expectations

The PR description should use real Markdown prose and cover:

- what changed
- why it changed
- the user or developer impact
- the root cause when the PR is a fix
- the checks used to validate it
