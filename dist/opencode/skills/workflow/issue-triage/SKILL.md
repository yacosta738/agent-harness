---
name: issue-triage
description: Use when reviewing, classifying, updating, or preparing issues in
  Linear, GitHub Issues, or a local tracker.
---

# Issue Triage

Move issues through a clear triage state machine so humans and agents know what
needs attention, what is blocked, and what is ready to implement.

This skill is tracker-agnostic. Use Linear, GitHub Issues, or local markdown
depending on the project.

## Core Rule

Do not turn vague issues into agent work. A `ready-for-agent` issue must be
specific, reproducible/verifiable, scoped, and free of unresolved product or
architecture decisions.

## Canonical Roles

Use these canonical roles internally, even if the tracker uses different
labels/statuses.

### Category

- `bug` — something is broken.
- `enhancement` — new feature or improvement.

### State

- `needs-triage` — maintainer review needed.
- `needs-info` — waiting on reporter or stakeholder.
- `ready-for-agent` — specified enough for an AFK agent.
- `ready-for-human` — requires human judgment, credentials, manual QA, or
  product decision.
- `wontfix` — intentionally not actioned.

Every triaged issue should have exactly one category and one state. If
labels/statuses conflict, stop and ask before changing anything.

## Tracker Selection

- **Linear**: use Linear tools/skill; consider `linear-pm` for multi-issue
  workflows.
- **GitHub Issues**: use GitHub/`gh` workflows.
- **Local**: read/write markdown in the user-approved tracker path.

Do not invent labels/statuses. Map canonical roles to existing project
conventions; ask before creating new labels/statuses.

## Show What Needs Attention

When asked what needs triage, present buckets:

1. **Unlabeled / no state** — never triaged.
2. **`needs-triage`** — awaiting maintainer evaluation.
3. **`needs-info` with new reporter activity** — ready for re-evaluation.
4. **Blocked or stale** — no movement and unclear next action.

Show counts and a one-line summary per issue. Let the maintainer pick.

## Triage Decision Tree

For each issue:

### 1. Is it clear what is being reported?

- **No** → `needs-info`. Ask reporter for reproduction steps, expected vs actual
  behavior, or clarification.
- **Yes** → continue.

### 2. Is it a bug or enhancement?

- **Bug** → category: `bug`.
- **Enhancement** → category: `enhancement`.

### 3. Is it actionable without human judgment?

Ask:

- Does it require a product decision? (priority, scope, UX direction)
- Does it require credentials or manual QA?
- Does it require architectural design or exploration?

- **Yes to any** → state: `ready-for-human`.
- **No** → continue.

### 4. Is it scoped and verifiable?

- **Bug**: Can an agent reproduce it and verify the fix?
- **Enhancement**: Is the acceptance criteria clear enough for an agent to
  implement and test?

- **No** → state: `needs-info` or `ready-for-human` (depending on who can
  clarify).
- **Yes** → state: `ready-for-agent`.

## Preparing an Issue for Agent Work

Before marking `ready-for-agent`, ensure:

### For Bugs

- **Reproduction steps** are explicit.
- **Expected vs actual behavior** is clear.
- **Environment** is specified (if relevant).
- **Verification criteria** is stated (how to confirm it's fixed).

### For Enhancements

- **Acceptance criteria** are explicit.
- **Scope** is bounded (what is in, what is out).
- **Test strategy** is clear (how to verify it works).

If any of these are missing, move to `needs-info` or `ready-for-human`.

## Output Format

When triaging, present:

```markdown
## Triage Summary

### Issue: [Title]

- **Current state**: [current labels/status]
- **Proposed state**: [new labels/status]
- **Reason**: [why this state]
- **Next action**: [who does what]
```

## Anti-Patterns

**Don't:**

- Mark vague issues as `ready-for-agent`.
- Invent new labels/statuses without asking.
- Triage issues that require product decisions as `ready-for-agent`.
- Skip verification criteria for bugs.
- Skip acceptance criteria for enhancements.

**Do:**

- Ask for clarification when needed.
- Map canonical roles to existing project conventions.
- Present triage decisions for maintainer approval.
- Ensure `ready-for-agent` issues are truly actionable.
