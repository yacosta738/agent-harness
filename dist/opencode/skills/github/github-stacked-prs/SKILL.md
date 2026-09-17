---
name: github-stacked-prs
description: Use when a delivery uses GitHub's official Stacked PRs model, `gh stack`, dependent PR layers, or Stack synchronization.
---

# GitHub Stacked PRs

## Overview

Use this skill only for the official GitHub Stack model provided by `github/gh-stack`. A Stack is a
linear dependency chain owned by GitHub/Git: the bottom branch targets the trunk and every higher
branch targets the immediately lower branch. `feature-branch-chain` is a separate legacy alternative
that uses an integration/tracker branch and MUST NOT use Stack metadata.

GitHub Stacked PRs (`github/gh-stack`) is a public-preview feature subject to change, so the
detection-only preflight, inspection gates, and safe stops in this skill are mandatory.

## Canonical contract

The only accepted `chain_strategy` values are:

- `github-stacked-prs` — GitHub Stack state, `.git/gh-stack`, and bottom-up integration.
- `feature-branch-chain` — separately approved tracker/integration branch workflow; no `gh stack`.
- `single-pr` — one ordinary PR.
- `size-exception` — one over-budget delivery with explicit maintainer approval.

`stacked-prs` and `stacked-to-main` are ambiguous legacy values. Stop and require `sdd-tasks`
regeneration instead of interpreting or migrating them silently.

Each layer is one independently reviewable work unit:

```text
work_unit = { branch, base, parent_branch, position, issue?, linear_url? }
main (trunk)
  └─ layer-1 (base: main)
      └─ layer-2 (base: layer-1)
          └─ layer-3 (base: layer-2)
```

Dependencies determine order. Cycles, missing dependencies, unclear ownership, a non-linear
history, a wrong base, or work outside the assigned layer are safe-stop conditions.

## Detection-only preflight

Before any Stack mutation, run read-only checks:

```bash
gh --version                 # policy requires >= 2.90
gh auth status
gh extension list            # must show github/gh-stack
git status --short            # must be empty
gh stack view --json         # output must be supported and unambiguous
git remote -v                # all branches/remotes must resolve to one repository; different repositories must stop
```

If `gh` is absent, below policy minimum, unauthenticated, or `github/gh-stack` is absent, STOP before
staging, committing, pushing, rebasing, or creating PRs. Report these exact manual commands; never run
them automatically:

```bash
brew install gh
# or install GitHub CLI using https://cli.github.com/
gh extension install github/gh-stack
# optional agent guidance, only if explicitly wanted:
gh skill install github/gh-stack
```

A dirty worktree, interrupted operation, ambiguous `gh stack view --json`, duplicate PR, wrong base,
divergence, conflict, queued/merged ambiguity, unsupported output, or partial failure also stops
mutation. Inspect state before retrying; never repeat a mutating command blindly.

## Non-interactive lifecycle

1. `gh stack init --base <trunk> <bottom> [child ...]` or adopt approved branches; record the
   dependency order and work-unit metadata before changing state.
2. Implement exactly one assigned layer. Use `gh stack add <branch>` only from the current top and
   keep coherent commits with `work-unit-commits`.
3. After explicit publish authorization, run `gh stack push`.
4. Let `pr-creator` create or update one template-compliant draft PR per layer with explicit
   `--base`/`--head`, then run `gh stack link <bottom> <child> ...` to link existing PRs. Inspect
   `gh pr list` first so no duplicate PR is created.
5. Use `gh stack view --json`, `gh pr view`, and `gh pr checks` to inspect every layer.
6. Preview `gh stack rebase`/`gh stack sync` impact. Rewrites and `--force-with-lease` require
   explicit confirmation; use `--continue` or `--abort` only for the observed operation.
7. Merge bottom-up with protections intact. `gh stack merge`/`--yes` requires explicit confirmation
   and must target only the inspected bottom-to-top range.

`gh stack submit --auto` is an escape hatch, not the default: use it only when template preservation,
body metadata, draft state, bases, and duplicate prevention have been explicitly verified.

## Metadata boundary

`pr-creator` preserves the repository template and appends `## Chain Context` with strategy, position,
base, dependencies, follow-up, review budget, issue references, and optional Linear URL. Linear and
GitHub issues are informational traceability only; Git/GitHub owns branch, Stack, PR, sync, and merge
state. Use `Fixes #N` only when closure is intentional; otherwise use `Related #N`.

## Pressure scenario matrix

Use these writing-skills pressure scenarios as the documentation test suite. The baseline failure is
an agent guessing, mutating, or publishing; the compliant result is the stated safe stop:

| Pressure | Required result before mutation |
|---|---|
| Missing `gh`, version below `2.90`, or missing `github/gh-stack` | Report the exact manual install commands and stop; never install automatically. |
| Dirty worktree, interrupted rebase, or ambiguous `gh stack view --json` | Report observed state and stop before staging, committing, pushing, or PR creation. |
| Higher layer targets `main`, wrong head/base, non-linear history, or duplicate PR | Identify the invariant violation and stop; do not retarget or create a duplicate silently. |
| `stacked-prs` or `stacked-to-main` is supplied, or Stack is mixed with `feature-branch-chain` | Require canonical strategy regeneration; never infer the workflow. |
| Assigned layer includes unrelated work or a dependency cycle | Stop at the layer boundary and return the out-of-scope or cyclic dependency. |
| Template cannot be preserved or submission would create duplicate PRs | Use independently authorized template-preserving PR creation or stop; never bypass the template. |
| Rebase, sync, rewrite, force-with-lease, or merge is requested without confirmation | Preview/inspect impact and wait for explicit confirmation. |
| Push, submit, sync, or merge partially fails | Preserve successful state, inspect Stack/PR state, and give recovery guidance; never retry blindly. |

No scenario may install tools, publish, rebase, or merge while preconditions are unresolved.

## Related skills

Use `reviewable-pr-slices` for budget decisions, `sdd-tasks` for dependency layers and bases,
`sdd-apply` for one assigned layer, `work-unit-commits` for coherent commits, `yeet` for explicit
publish authorization, and `pr-creator` for PR content. This skill owns only Stack mechanics.
