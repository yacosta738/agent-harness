---
name: cognitive-doc-design
description: Use when improving readability of existing documentation, PR descriptions, review notes, onboarding docs, RFCs, or guides; not for creating durable SDD specs or designs.
---

# Cognitive Doc Design

## Overview

Write documentation that lowers cognitive load. Lead with the useful answer, then reveal context,
details, and edge cases in layers.

## Pressure Scenario

Without this skill, an agent writes a dense PR body or design doc that is technically complete but
forces the reader to reconstruct intent, scope, and verification.

With this skill, the document gives reviewers a clear path: what changed, why, where to look, what
is out of scope, and how to verify it.

## When to Use

Use for:

- PR descriptions and review notes.
- READMEs, guides, onboarding docs, RFCs, and existing non-SDD specs/design docs for readability
  cleanup only.
- Long or dense markdown that needs to be easier to scan.

Use `yuniel-writing-style` instead when writing Yuniel's personal articles or public narrative
posts. Combine with `markdown-a11y` for public Markdown accessibility.

For durable SDD specs or designs, use `sdd-spec` or `sdd-design` to create the artifact. Use this
skill only as a readability overlay after the required SDD workflow is selected.

## Core Patterns

| Pattern                 | Rule                                                                        |
|-------------------------|-----------------------------------------------------------------------------|
| Lead with the answer    | Put the decision, action, or outcome first. Context comes after.            |
| Progressive disclosure  | Start with the happy path, then details, edge cases, and references.        |
| Chunking                | Use small sections. Split long lists and paragraphs.                        |
| Signposting             | Use headings, labels, summaries, and tables so readers know where they are. |
| Recognition over recall | Prefer tables, checklists, examples, and templates over memory-heavy prose. |
| Review empathy          | State what to review, what to ignore, and how to verify.                    |

## Default Shape

```markdown
# <Outcome-oriented title>

<One short paragraph: what changed, who it helps, and why it matters.>

## Quick path

1. <First action or review target>
2. <Second action or detail>
3. <Verification or expected result>

## Details

| Topic | Decision |
|-------|----------|
| <area> | <concise explanation> |

## Checklist

- [ ] <Reader can verify this>
- [ ] <Reader can verify that>

## Next step

<Link, command, or follow-up action.>
```

## Common Mistakes

| Mistake                       | Fix                                         |
|-------------------------------|---------------------------------------------|
| Burying the decision          | Put the outcome in the first paragraph.     |
| Writing one giant explanation | Split into quick path, details, checklist.  |
| Making reviewers infer scope  | Add in-scope and out-of-scope bullets.      |
| Saying "tested" vaguely       | List exact commands or manual verification. |
