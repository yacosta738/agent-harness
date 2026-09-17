---
name: rdd-review
description: Use when the opt-in Receipt-Driven Development review mode is enabled for a finished candidate.
---

# Receipt-Driven Development

RDD reviews one finished candidate without owning delivery. It is disabled by default and never
authorizes commit, push, pull request, release, or archive.

## Lifecycle

`assess → start → bound capture → optional one correction → approved → exact acknowledgement → burned`

Use only the exact `next_transition` and binding returned by the control plane. Never reconstruct a
lineage, revision, target, or acknowledgement token from prose. Reviewers inspect the materialized
read-only candidate, not the live worktree.

## Review rules

- Passive documentation candidate: structural readback only.
- Medium candidate: one focused reviewer.
- High candidate: `lens` and `mirror` with the 4R rubric.
- Only candidate-caused CRITICAL/P0/P1 findings may request the single bounded `scalpel` correction.
- Missing, malformed, stale, or unavailable evidence is `Needs your decision`, never approval.

Manual `double-blind-review` remains available and does not create RDD authority.
