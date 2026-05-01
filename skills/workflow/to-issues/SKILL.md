---
name: to-issues
description: Use when converting a plan, spec, PRD, design, or brainstorming output into implementation issues for Linear, GitHub Issues, or a local tracker.
---

# To Issues

Convert a plan into independently grabbable issues using **vertical slices**. This skill is tracker-agnostic: publish to Linear, GitHub Issues, or a local markdown tracker depending on the project.

## Core Rule

Break work into **tracer-bullet vertical slices**, not horizontal layers.

A good issue delivers a narrow but complete path through the system and is independently demoable or verifiable. Prefer many thin issues over a few thick ones.

## When to Use

Use when the user asks to:

- Convert a plan/spec/PRD into issues or tickets.
- Create implementation tasks for Linear or GitHub.
- Break work into agent-ready slices.
- Prepare backlog items from a temporary plan in `tmp/plans/` or durable SDD artifacts in `openspec/changes/`.

Do NOT use this instead of SDD. If the source material is vague, missing requirements, or contains unresolved architecture decisions, stop and recommend `brainstorming` for temporary work or SDD for durable product/architecture work.

## Process

### 1. Gather Source Context

Read the source material fully:

- Conversation context.
- `tmp/plans/*.md` temporary plans.
- `openspec/changes/**` SDD artifacts.
- Existing Linear/GitHub issue if the user provides a URL or identifier.

If codebase context affects issue titles or scope, explore enough to use the project's domain language. Check `CONTEXT.md`, `CONTEXT-MAP.md`, and relevant ADRs when present.

### 2. Select Tracker

Determine where issues should be created:

- **Linear**: use the Linear skill/tools or `linear-pm` for heavier workflows.
- **GitHub Issues**: use GitHub/`gh` workflows.
- **Local tracker**: write markdown files under a user-approved path.

If the tracker is unclear, ask exactly one question: "Which tracker should these issues go to: Linear, GitHub Issues, or local markdown?"

### 3. Draft Vertical Slices

For each slice, classify:

- **Type**: `AFK` or `HITL`
  - `AFK`: agent can implement without human judgment after issue creation.
  - `HITL`: requires human decision, design review, credentials, manual QA, or product judgment.
- **Blocked by**: real dependencies only.
- **Behavior covered**: the user-visible or system-visible capability.

Vertical slice rules:

- Each slice cuts through all required layers for one narrow behavior.
- A completed slice is demoable or verifiable by itself.
- Avoid "create DB schema", "add API", "build UI" as separate issues unless each is independently useful.
- Prefer thin issues that can be done and verified independently.

### 4. Review Breakdown With User

Present a numbered list before publishing anything:

```md
1. [AFK] Title
   Behavior: ...
   Blocked by: None / #...
   Acceptance: ...
```

Ask the user to confirm:

- Is granularity too coarse or too fine?
- Are dependencies correct?
- Should any slices be merged or split?
- Are `AFK`/`HITL` classifications correct?

Do not publish until the user approves the breakdown.

### 5. Publish Issues

Create issues in dependency order (blockers first). Use the tracker-specific tools and preserve existing project conventions for labels/statuses.

Issue body template:

```md
## Parent

<Parent issue/spec/plan reference, if any>

## What to build

<Concise vertical-slice behavior. Describe end-to-end behavior, not layer-by-layer implementation.>

## Type

AFK | HITL

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

None - can start immediately
```

Rules:

- Use domain language, not internal jargon, unless internal terms are the domain language.
- Avoid stale file paths unless the issue is explicitly for a known file-level refactor.
- Do not close or modify parent issues unless the user explicitly asks.
- Do not invent labels/statuses. If the project has triage labels, use them; otherwise ask before creating new ones.

## Output

After publishing, summarize:

- Issues created with URLs/IDs.
- Dependency order.
- Which issues are `AFK` vs `HITL`.
- Any unresolved assumptions or follow-up decisions.
