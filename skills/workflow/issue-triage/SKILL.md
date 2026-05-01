---
name: issue-triage
description: Use when reviewing, classifying, updating, or preparing issues in Linear, GitHub Issues, or a local tracker.
---

# Issue Triage

Move issues through a clear triage state machine so humans and agents know what needs attention, what is blocked, and what is ready to implement.

This skill is tracker-agnostic. Use Linear, GitHub Issues, or local markdown depending on the project.

## Core Rule

Do not turn vague issues into agent work. A `ready-for-agent` issue must be specific, reproducible/verifiable, scoped, and free of unresolved product or architecture decisions.

## Canonical Roles

Use these canonical roles internally, even if the tracker uses different labels/statuses.

### Category

- `bug` — something is broken.
- `enhancement` — new feature or improvement.

### State

- `needs-triage` — maintainer review needed.
- `needs-info` — waiting on reporter or stakeholder.
- `ready-for-agent` — specified enough for an AFK agent.
- `ready-for-human` — requires human judgment, credentials, manual QA, or product decision.
- `wontfix` — intentionally not actioned.

Every triaged issue should have exactly one category and one state. If labels/statuses conflict, stop and ask before changing anything.

## Tracker Selection

- **Linear**: use Linear tools/skill; consider `linear-pm` for multi-issue workflows.
- **GitHub Issues**: use GitHub/`gh` workflows.
- **Local**: read/write markdown in the user-approved tracker path.

Do not invent labels/statuses. Map canonical roles to existing project conventions; ask before creating new labels/statuses.

## Show What Needs Attention

When asked what needs triage, present buckets:

1. **Unlabeled / no state** — never triaged.
2. **`needs-triage`** — awaiting maintainer evaluation.
3. **`needs-info` with new reporter activity** — ready for re-evaluation.
4. **Blocked or stale** — no movement and unclear next action.

Show counts and a one-line summary per issue. Let the maintainer pick.

## Triage a Specific Issue

### 1. Gather Context

Read the full issue:

- body
- comments
- labels/status
- author/reporter
- dates
- linked issues/PRs
- previous triage notes

If relevant, explore the codebase for domain language and likely affected behavior. Check `CONTEXT.md`, `CONTEXT-MAP.md`, and ADRs when present.

### 2. Recommend Category + State

Present:

- Recommended category.
- Recommended state.
- Reasoning.
- What evidence is missing, if any.

Wait for maintainer direction before applying changes unless the user explicitly asked for an automatic batch triage.

### 3. Reproduce Bugs Before Grilling

For `bug` issues, attempt reproduction before asking many questions:

- Follow reporter steps.
- Run relevant tests/commands if safe.
- Trace likely code paths if needed.
- Report: reproduced, not reproduced, or insufficient detail.

If you need to debug/fix, switch to `systematic-debugging`. Triage does not fix bugs.

### 4. Clarify Only What Blocks Triage

If information is missing, ask precise questions. Avoid vague "please provide more info" comments.

`needs-info` comment template:

```md
## Triage notes

**What we established:**

- ...

**What we still need:**

- Specific question 1
- Specific question 2
```

### 5. Prepare Agent Briefs

For `ready-for-agent`, add a durable brief:

```md
## Agent brief

**Goal:** ...

**Current behavior:** ...

**Expected behavior:** ...

**Acceptance criteria:**

- [ ] ...

**Verification:**

- Command/manual check: ...

**Constraints:**

- ...
```

If implementation requires behavior changes, mention that the implementer must load/use `test-driven-development`.

## State Outcomes

- `ready-for-agent`: issue has clear goal, acceptance criteria, verification, and no unresolved decisions.
- `ready-for-human`: issue is clear but requires judgment, credentials, manual validation, or product decision.
- `needs-info`: concrete missing information blocks progress.
- `wontfix`: explain why respectfully. If the reason is durable, record it in project docs or a local out-of-scope note if the project uses one.

## Output

After triage, summarize:

- Changed labels/statuses.
- Comments/briefs posted.
- Remaining blockers.
- Recommended next action.
