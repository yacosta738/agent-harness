---
name: domain-language
description: Use when defining project terminology, creating or updating
  CONTEXT.md, resolving ambiguous domain terms, or applying DDD ubiquitous
  language.
---

# Domain Language

Create and maintain a concise project glossary so humans and agents use the same
terms for the same concepts.

## Core Rule

Only document terms that matter to domain experts or project understanding. Do
not fill `CONTEXT.md` with generic programming concepts or implementation
trivia.

## When to Use

Use this skill when:

- The user mentions DDD, ubiquitous language, domain model, glossary, or
  terminology.
- A conversation reveals overloaded terms (e.g., "account" means two things).
- `brainstorming`, `codebase-architecture`, SDD, or issue triage needs sharper
  language.
- A new durable domain concept is discovered and should be captured.

For temporary brainstorming artifacts, propose terms in conversation first.
Update `CONTEXT.md` only when the term is durable.

## Source Inputs

Gather terms from:

- Current conversation.
- Existing `CONTEXT.md` or `CONTEXT-MAP.md`.
- ADRs in `docs/adr/`.
- User stories, specs, issues, and product docs.
- Code only when it reflects domain vocabulary, not implementation detail.

If multiple bounded contexts exist, use `CONTEXT-MAP.md` to decide which
`CONTEXT.md` should be updated.

## Process

### 1. Extract Candidate Terms

Look for nouns, verbs, states, lifecycle names, actor names, and business
events.

Flag:

- Same word used for different concepts.
- Different words used for the same concept.
- Vague terms that hide decisions.
- Terms that conflict with existing `CONTEXT.md` definitions.

### 2. Propose Candidate Terms

Present terms to the user in this format:

```markdown
## Proposed Domain Terms

- **[Term]**: [One-sentence definition]
  - Context: [Where it appears]
  - Replaces: [Old term, if any]
  - Conflicts: [Existing definition, if any]
```

### 3. Update CONTEXT.md

Once approved, add or update entries in `CONTEXT.md`:

```markdown
## Domain Glossary

### [Term]

[Definition in 1-3 sentences. Focus on what it means in this project, not
generic definitions.]

**Examples:**

- [Concrete example from the codebase or domain]
- [Another example if helpful]

**Related:** [Other terms in this glossary]
```

## Quality Checks

Before updating `CONTEXT.md`:

- **Is it domain-specific?** If the term applies to any software project, it
  doesn't belong.
- **Is it durable?** If it's only relevant to this week's work, keep it in
  conversation.
- **Is it precise?** Vague definitions create more confusion than clarity.
- **Does it conflict?** If it contradicts existing terms, resolve the conflict
  first.

## Anti-Patterns

**Don't document:**

- Generic programming terms (function, class, module, API, database).
- Implementation details (Redis key, Postgres table, React component).
- Temporary names from brainstorming (unless they become durable).
- Terms that are obvious from context.

**Do document:**

- Domain entities (User, Order, Payment, Shipment).
- Domain events (OrderPlaced, PaymentProcessed).
- Domain states (Pending, Confirmed, Shipped).
- Domain roles (Buyer, Seller, Admin).
- Domain processes (Checkout, Fulfillment, Refund).

## Example: Good vs Bad

**Bad:**

```markdown
### API

An interface for communication between systems.
```

**Good:**

```markdown
### Gateway

The HTTP entry point for external clients. Handles authentication, rate
limiting, and routing to internal services. Not to be confused with "Service
Gateway" (internal routing) or "Payment Gateway" (third-party payment
processor).

**Examples:**

- `POST /api/orders` routes through the Gateway to the Order Service.
- The Gateway enforces API key validation before forwarding requests.

**Related:** Service Gateway, Payment Gateway
```
