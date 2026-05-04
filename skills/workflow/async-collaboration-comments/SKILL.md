---
name: async-collaboration-comments
description: Use when drafting human-facing comments in PRs, issues, reviews, Linear, Slack, Discord, Notion, or posting only when the user explicitly requests the write action.
---

# Async Collaboration Comments

## Overview

Write comments that are warm, direct, and useful fast. The reader should know the point, the reason, and the next action without decoding corporate filler.

## Pressure Scenario

Without this skill, an agent writes a long generic reply, piles on minor nits, or sounds like a bot. The comment creates more coordination cost than it removes.

With this skill, the agent writes one focused comment in the thread language, explains the technical why when needed, and gives a concrete next action.

## When to Use

Use when drafting:

- GitHub PR or issue comments.
- Review feedback or requested changes.
- Linear updates.
- Slack, Discord, Notion, or async project replies.

Use `gh-address-comments` when you need to inspect unresolved GitHub review threads before drafting. Use `receiving-code-review` when processing feedback directed at our code.

## Voice Rules

| Rule | Requirement |
|------|-------------|
| Be useful fast | Start with the actionable point. |
| Be warm and direct | Sound like a thoughtful teammate, not a corporate bot. |
| Keep it short | Prefer 1-3 short paragraphs or a tight bullet list. |
| Explain why | Give the technical reason when asking for a change. |
| Avoid pile-ons | Comment on the highest-value issue, not every small preference. |
| Match language | Reply in the user's or thread's language. Spanish should be natural, warm, and direct. |
| No fake certainty | If unsure, say what needs verification. |

## Comment Formula

```text
<Direct observation or request>

<Why it matters, only if needed>

<Concrete next action>
```

## Examples

### Request a change

```markdown
Buenísimo el enfoque. Aquí separaría la validación del wiring de UI porque ahora el PR mezcla dos decisiones distintas.

Eso baja la carga del reviewer y deja el rollback más claro si falla la integración.
```

### Ask for a split

```markdown
Este PR ya está por encima del presupuesto razonable de review. Mejor lo dividimos antes de seguir.

Mi sugerencia: primero foundation con tests, después integración, después docs. Así cada review tiene inicio y fin claros.
```

### Approve with note

```markdown
Está bien encaminado y el scope se entiende rápido.

Lo apruebo. Para el próximo PR, agrega el link al anterior y al siguiente para que la cadena quede navegable.
```

## Common Mistakes

- Do not recap the whole PR before giving the point.
- Do not write five comments when one higher-level comment solves the issue.
- Do not soften a real blocker until it sounds optional.
- Do not post externally unless the user explicitly asked for that write action.
