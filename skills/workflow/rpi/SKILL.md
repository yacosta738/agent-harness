---
name: rpi
description: Use for everyday RPI routing and substantial non-SDD task tracking.
---

# RPI

RPI is the default loop: authorize the outcome, explore proportionately, resolve only decision-changing
uncertainty, select Direct or Delegated direct, implement, check, and close with evidence.

## Routing

- **Direct inline:** the action is understood and bounded.
- **Delegated direct:** fresh context materially helps exploration, writing, testing, or review.
- **Explicit SDD:** only after the user requests or accepts durable proposal/spec/design/task artifacts.

Never infer SDD from size, risk, ambiguity, architecture, persistence, or file count. Brainstorming,
debugging, and planning are internal RPI techniques.

## Task documents

When authorized work has two or more meaningful implementation steps or progress worth recovering:

1. Create `plan/tasks/<feature>.md` before the first source write.
2. Keep the task document concise with stable `RPI-NNN` IDs, acceptance criteria, evidence,
   progress, and next step.
3. Record the relevant verification evidence in the task document before reporting `Ready`.
4. Mirror the current document to Engram topic `plan/<feature>/tasks`.

Small and read-only work creates no RPI artifact.
