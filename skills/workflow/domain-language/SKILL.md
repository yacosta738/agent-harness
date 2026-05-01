---
name: domain-language
description: Use when defining project terminology, creating or updating CONTEXT.md, resolving ambiguous domain terms, or applying DDD ubiquitous language.
---

# Domain Language

Create and maintain a concise project glossary so humans and agents use the same terms for the same concepts.

## Core Rule

Only document terms that matter to domain experts or project understanding. Do not fill `CONTEXT.md` with generic programming concepts or implementation trivia.

## When to Use

Use this skill when:

- The user mentions DDD, ubiquitous language, domain model, glossary, or terminology.
- A conversation reveals overloaded terms (e.g., "account" means two things).
- `brainstorming`, `codebase-architecture`, SDD, or issue triage needs sharper language.
- A new durable domain concept is discovered and should be captured.

For temporary brainstorming artifacts, propose terms in conversation first. Update `CONTEXT.md` only when the term is durable.

## Source Inputs

Gather terms from:

- Current conversation.
- Existing `CONTEXT.md` or `CONTEXT-MAP.md`.
- ADRs in `docs/adr/`.
- User stories, specs, issues, and product docs.
- Code only when it reflects domain vocabulary, not implementation detail.

If multiple bounded contexts exist, use `CONTEXT-MAP.md` to decide which `CONTEXT.md` should be updated.

## Process

### 1. Extract Candidate Terms

Look for nouns, verbs, states, lifecycle names, actor names, and business events.

Flag:

- Same word used for different concepts.
- Different words used for the same concept.
- Vague terms that hide decisions.
- Terms that conflict with existing `CONTEXT.md` definitions.

### 2. Propose Canonical Terms

Be opinionated. Pick the clearest term and list aliases to avoid.

For each term, define:

- **Term**
- **Definition**: one sentence, what it is.
- **Aliases to avoid**
- **Relationships** to other terms, when useful.

### 3. Confirm Before Writing

Show proposed changes to the user before editing persistent docs unless they explicitly asked for direct updates.

Ask exactly one question when blocked:

> "Should I write these terms to `CONTEXT.md`, or keep them as temporary brainstorming notes?"

### 4. Update CONTEXT.md

Use this structure:

```md
# Context

## Language

| Term | Definition | Avoid |
| ---- | ---------- | ----- |
| **Term** | One sentence definition. | Alias, vague term |

## Relationships

- A **Term** belongs to exactly one **Other Term**.

## Flagged ambiguities

- "account" was used to mean both **Customer** and **User**. Use **Customer** for the buyer and **User** for the authenticated identity.
```

If the existing file already has a different but consistent structure, preserve it.

## Writing Rules

- Definitions must be tight: one sentence max.
- Use bold term names in relationships.
- Include cardinality when obvious.
- Group terms by subdomain/lifecycle when useful.
- Do not include class names, file names, or module names unless they are also domain terms.
- Do not rename code automatically. Updating language docs is not implementation.

## ADR Boundary

If resolving a term also locks in a hard-to-reverse architecture/product decision, do not hide that decision in `CONTEXT.md`. Offer an ADR when the decision is:

1. Hard to reverse.
2. Surprising without context.
3. The result of a real trade-off.

## Output

After updating or proposing language, summarize:

- Terms added/changed.
- Ambiguities resolved.
- Terms still needing human decision.
- Whether an ADR is recommended.
