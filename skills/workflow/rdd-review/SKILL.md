---
name: rdd-review
description: Use when `/review` starts a mandatory Receipt-Driven Development cycle or when an explicitly enabled RDD review is requested.
---

# Receipt-Driven Development

RDD reviews one finished candidate without owning delivery. The optional global RDD mode remains
available for direct control-plane use. Every explicit `/review` invocation starts RDD regardless of
that global mode. RDD never authorizes commit, push, pull request, release, or archive.

## Lifecycle

`assess → start → bound capture → optional one correction → correction re-review → approved → exact acknowledgement → burned`

Use only the exact `next_transition` and binding returned by the control plane. Never reconstruct a
lineage, revision, target, or acknowledgement token from prose. Reviewers inspect the materialized
candidate with write permissions removed, not the live worktree. The control plane verifies the
candidate tree again before it accepts review evidence.

## Review rules

- Passive documentation candidate: one `code-reviewer` performs a structural 4R readback; explain
  any lens that does not apply.
- Medium candidate: one focused reviewer.
- High candidate: `lens` and `mirror` with the 4R rubric.
- Only candidate-caused CRITICAL/P0/P1 findings may request the single bounded `scalpel` correction.
- After a correction passes validation, materialize its successor candidate and review it again with
  4R and the reviewers returned by the control plane. A second CRITICAL/P0/P1 finding escalates; it
  does not start another correction.
- Missing, malformed, stale, or unavailable evidence is `Needs your decision`, never approval.
- An escalated or unmaterializable transaction can be closed only after the user chooses to defer or
  abandon it. Use the exact `recovery_transition` token with `review.mjs close`; closure is recorded
  as
  `closed_without_approval` and does not approve the candidate.

Manual `double-blind-review` remains available and does not create RDD authority.
