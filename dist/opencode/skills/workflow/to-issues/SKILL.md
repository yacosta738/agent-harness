---
name: to-issues
description: Use when converting a plan, spec, PRD, design, or brainstorming
  output into implementation issues for Linear, GitHub Issues, or a local
  tracker.
---

# To Issues

Convert a plan into independently grabbable issues using **vertical slices**.
This skill is tracker-agnostic: publish to Linear, GitHub Issues, or a local
markdown tracker depending on the project.

## Core Rule

Break work into **tracer-bullet vertical slices**, not horizontal layers.

A good issue delivers a narrow but complete path through the system and is
independently demoable or verifiable. Prefer many thin issues over a few thick
ones.

## When to Use

Use when the user asks to:

- Convert a plan/spec/PRD into issues or tickets.
- Create implementation tasks for Linear or GitHub.
- Break work into agent-ready slices.
- Prepare backlog items from a temporary plan in `tmp/plans/` or durable SDD
  artifacts in `openspec/changes/`.

Do NOT use this instead of SDD. If the source material is vague, missing
requirements, or contains unresolved architecture decisions, stop and recommend
`brainstorming` for temporary work or SDD for durable product/architecture work.

## Process

### 1. Gather Source Context

Read the source material fully:

- Conversation context.
- `tmp/plans/*.md` temporary plans.
- `openspec/changes/**` SDD artifacts.
- Existing Linear/GitHub issue if the user provides a URL or identifier.

If codebase context affects issue titles or scope, explore enough to use the
project's domain language. Check `CONTEXT.md`, `CONTEXT-MAP.md`, and relevant
ADRs when present.

### 2. Select Tracker

Determine where issues should be created:

- **Linear**: use the Linear skill/tools or `linear-pm` for heavier workflows.
- **GitHub Issues**: use GitHub/`gh` workflows.
- **Local tracker**: write markdown files under a user-approved path.

If the tracker is unclear, ask exactly one question: "Which tracker should these
issues go to: Linear, GitHub Issues, or local markdown?"

### 3. Slice Vertically

For each feature or requirement, identify the thinnest vertical slice that:

- Touches all relevant layers (UI, API, data, tests).
- Is independently demoable or verifiable.
- Can be implemented and merged without blocking other slices.

**Good vertical slice:**

> Add login form that validates email format and shows error message.

**Bad horizontal slice:**

> Build authentication service (no UI, no verification path).

### 4. Draft Issue Bodies

For each slice, draft:

```md
## Goal

[One sentence: what this issue delivers]

## Acceptance Criteria

- [ ] [Observable behavior 1]
- [ ] [Observable behavior 2]
- [ ] [Observable behavior 3]

## Scope

**In scope:**

- [What this issue includes]

**Out of scope:**

- [What this issue explicitly does NOT include]

## Verification

[How to verify this issue is complete]
```

### 5. Present for Approval

Show the user:

```markdown
## Proposed Issues

### Issue 1: [Title]

[Draft body]

### Issue 2: [Title]

[Draft body]

...

**Tracker**: [Linear | GitHub Issues | Local markdown]

Ready to create?
```

Wait for approval before creating.

### 6. Create Issues

Once approved:

- **Linear**: use Linear tools/skill.
- **GitHub Issues**: use GitHub/`gh` workflows.
- **Local markdown**: write to the user-approved tracker path.

Confirm issues were created and provide IDs/URLs.

## Anti-Patterns

**Don't:**

- Create horizontal layer issues (backend-only, frontend-only).
- Create issues without acceptance criteria.
- Create issues without verification steps.
- File issues without user approval.
- Skip codebase exploration when domain language matters.

**Do:**

- Slice vertically through all layers.
- Make each issue independently demoable.
- Use project domain language in titles and bodies.
- Wait for approval before creating.
- Provide issue IDs/URLs after creation.
