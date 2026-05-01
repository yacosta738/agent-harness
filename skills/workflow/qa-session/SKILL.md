---
name: qa-session
description: Use when the user wants to report bugs conversationally, run a manual QA session, capture product issues, or turn observed problems into tracker issues.
---

# QA Session

Run an interactive QA session where the user reports problems and you convert them into clear, durable issues. This skill captures bugs and product gaps; it does not fix them.

## Core Rule

Write issues from the user's perspective, focused on observable behavior. Do not cite implementation details unless the issue is explicitly internal/developer-facing.

## For Each Reported Issue

### 1. Listen and Lightly Clarify

Let the user describe the problem naturally. Ask at most 2-3 short questions, focused on:

- What happened?
- What did you expect instead?
- What are the steps to reproduce?
- Is it consistent or intermittent?

Do not over-interview. If the report is clear enough to file, move on.

### 2. Explore for Context, Not Fixes

If codebase context helps write a better issue, explore lightly to understand:

- domain language (`CONTEXT.md` / `CONTEXT-MAP.md` if present)
- expected behavior boundary
- relevant product area
- whether one report is actually multiple independent issues

Do NOT debug or implement a fix. If the user wants a fix, switch to `systematic-debugging` after filing or confirming the issue.

### 3. Decide Single Issue vs Breakdown

Break into multiple issues when:

- The report contains independent symptoms.
- Work can be implemented/tested independently.
- Different areas or user flows are affected.
- One issue would become too broad to verify.

Keep as one issue when the symptoms describe one behavior failure with one clear verification path.

### 4. Choose Tracker

Use the tracker requested by the user or project:

- Linear
- GitHub Issues
- Local markdown

If unclear, ask exactly one question: "Where should I file these QA issues: Linear, GitHub Issues, or local markdown?"

### 5. Draft Issue Body

Use this template:

```md
## What happened

<Actual observable behavior.>

## What I expected

<Expected behavior from the user's perspective.>

## Steps to reproduce

1. ...
2. ...
3. ...

## Impact

<Who is affected and how severe it is.>

## Additional context

<Relevant observations, environment, screenshots/logs if provided. Avoid stale file paths.>
```

For breakdown issues, add:

```md
## Parent

<Parent issue/session reference>

## Blocked by

None - can start immediately
```

## Rules for Durable QA Issues

- No stale file paths or line numbers unless the issue is developer-internal.
- Use domain language, not implementation jargon.
- Reproduction steps are mandatory for bugs unless impossible; if missing, mark as `needs-info`.
- Keep each issue readable in 30 seconds.
- Prefer behavior and acceptance criteria over proposed fixes.
- If behavior changes are required, implementation should load/use `test-driven-development`.

## Session Loop

After filing or drafting each issue, summarize its title and tracker URL/ID, then ask:

> "Next issue, or are we done?"

Continue until the user says the QA session is done.

## Output

At the end, provide:

- Issues created/drafted.
- Which ones need more info.
- Which ones are likely `ready-for-agent` vs `ready-for-human`.
- Any recommended follow-up triage using `issue-triage`.
