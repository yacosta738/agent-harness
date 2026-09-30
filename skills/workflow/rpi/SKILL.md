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

1. Before creating a task document, inspect both `.agents/rpi/plan/tasks/` and the legacy
   `plan/tasks/` location.
2. If `plan/tasks/` exists and `.agents/rpi/plan/tasks/` does not, move the entire legacy
   `plan/tasks/` directory to `.agents/rpi/plan/tasks/`, preserve its files without rewriting them,
   verify the destination, and report the migration. Leave the parent `plan/` directory in place.
3. If both locations exist, do not merge, overwrite, or delete anything. Compare their relative
   paths, report collisions and differences, and stop before creating a new task document until the
   orchestrator resolves the conflict.
4. Create `.agents/rpi/plan/tasks/<feature>.md` before the first source write.
5. Keep the task document concise with stable `RPI-NNN` IDs, acceptance criteria, evidence,
   progress, and next step.
6. Record the relevant verification evidence in the task document before reporting `Ready`.
7. Mirror the current document to Engram topic `rpi/<feature>/tasks`.

Small and read-only work creates no RPI artifact.
