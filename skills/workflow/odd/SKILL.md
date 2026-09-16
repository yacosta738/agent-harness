---
name: odd
description: Use for everyday Organic Driven Development routing and substantial non-SDD task tracking.
---

# Organic Driven Development

ODD is the default loop: authorize the outcome, explore proportionately, resolve only decision-changing
uncertainty, select Direct or Delegated direct, implement, check, and close with evidence.

## Routing

- **Direct inline:** the action is understood and bounded.
- **Delegated direct:** fresh context materially helps exploration, writing, testing, or review.
- **Explicit SDD:** only after the user requests or accepts durable proposal/spec/design/task artifacts.

Never infer SDD from size, risk, ambiguity, architecture, persistence, or file count. Brainstorming,
debugging, and planning are internal ODD techniques.

## Task documents

When authorized work has two or more meaningful implementation steps or progress worth recovering:

1. Run `node scripts/odd-task.mjs init "<feature>"` before the first source write.
2. Keep `odd/tasks/<feature>.md` concise with stable `ODD-NNN` IDs, acceptance criteria, evidence,
   progress, and next step.
3. Run `node scripts/odd-task.mjs check <slug>` before reporting `Ready`.
4. Mirror the current document to Engram topic `odd/<feature>/tasks`.

Small and read-only work creates no ODD artifact.
