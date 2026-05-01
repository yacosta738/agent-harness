---
name: qa-session
description: Use when the user wants to report bugs conversationally, run a
  manual QA session, capture product issues, or turn observed problems into
  tracker issues.
---

# QA Session

Run an interactive QA session where the user reports problems and you convert
them into clear, durable issues. This skill captures bugs and product gaps; it
does not fix them.

## Core Rule

Write issues from the user's perspective, focused on observable behavior. Do not
cite implementation details unless the issue is explicitly internal/developer-
facing.

## For Each Reported Issue

### 1. Listen and Lightly Clarify

Let the user describe the problem naturally. Ask at most 2-3 short questions,
focused on:

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

Do NOT debug or implement a fix. If the user wants a fix, switch to
`systematic-debugging` after filing or confirming the issue.

### 3. Decide Single Issue vs Breakdown

Break into multiple issues when:

- The report contains independent symptoms.
- Work can be implemented/tested independently.
- Different areas or user flows are affected.
- One issue would become too broad to verify.

Keep as one issue when the symptoms describe one behavior failure with one clear
verification path.

### 4. Choose Tracker

Use the tracker requested by the user or project:

- Linear
- GitHub Issues
- Local markdown

If unclear, ask exactly one question: "Where should I file these QA issues:
Linear, GitHub Issues, or local markdown?"

### 5. Draft Issue Body

Use this template:

```md
## What happened

[Observable behavior from user's perspective]

## What I expected

[Expected behavior from user's perspective]

## Steps to reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Environment (if relevant)

- Browser/OS/Device: [if applicable]
- Version: [if applicable]

## Additional context

[Any other relevant details]
```

### 6. Present Draft for Approval

Show the user:

```markdown
## Proposed Issue: [Title]

[Draft body]

**Tracker**: [Linear | GitHub Issues | Local markdown]
**Labels/State**: [if applicable]

Ready to file?
```

Wait for approval before filing.

### 7. File the Issue

Once approved:

- **Linear**: use Linear tools/skill.
- **GitHub Issues**: use GitHub/`gh` workflows.
- **Local markdown**: write to the user-approved tracker path.

Confirm the issue was filed and provide the issue ID/URL.

## Session Summary

At the end of the session, present:

```markdown
## QA Session Summary

- **Issues filed**: [count]
- **Tracker**: [Linear | GitHub Issues | Local markdown]

### Filed Issues

1. [Issue ID/URL]: [Title]
2. [Issue ID/URL]: [Title]
...

Next: Would you like me to investigate or fix any of these?
```

## Anti-Patterns

**Don't:**

- Debug or implement fixes during QA session.
- Over-interview the user with 10+ clarifying questions.
- File issues without user approval.
- Cite implementation details in user-facing issue bodies.
- Combine independent symptoms into one issue.

**Do:**

- Listen first, clarify lightly.
- Write from the user's perspective.
- Break down multi-symptom reports when appropriate.
- Wait for approval before filing.
- Offer to investigate/fix after filing.
