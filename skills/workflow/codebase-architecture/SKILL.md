---
name: codebase-architecture
description: Use when the user asks to improve architecture, refactor complex areas, reduce technical debt, consolidate shallow modules, reduce tight coupling, design cleaner interfaces, or make the codebase more testable.
---

# Codebase Architecture Audit & Improvement

Use this skill to identify architectural friction and propose **deepening opportunities** — refactoring paths that turn shallow modules into deep, high-leverage modules. 

The primary goals are testability, isolation, and AI-navigability.

## 1. Glossary (Strict Vocabulary)

Use these terms exactly. Consistent language is crucial to avoid ambiguity. Do not substitute with generic terms like "component," "service," or "API".

- **Module**: Anything with an interface and an implementation (function, class, package, slice).
- **Interface**: Everything a caller must know to use the module correctly (types, invariants, ordering constraints, error modes, configuration). Not just the type signature.
- **Implementation**: The code inside a module.
- **Depth**: Leverage at the interface. A module is **deep** when a large amount of behavior sits behind a small interface. A module is **shallow** when the interface is nearly as complex as the implementation.
- **Seam**: A place where you can alter behavior without editing in that place. The location where an interface lives.
- **Adapter**: A concrete thing that satisfies an interface at a seam (describes a role, not substance).
- **Leverage**: What callers get from depth.
- **Locality**: What maintainers get from depth (change, bugs, and knowledge concentrate in one place).

### Core Principles
- **The Deletion Test**: Imagine deleting the module. If complexity vanishes, it was a shallow pass-through. If complexity reappears across N callers, it was earning its keep (deep).
- **The interface is the test surface**. If a test has to change when internal implementation changes, it is testing past the interface.
- **One adapter = hypothetical seam. Two adapters = real seam.** Don't introduce an interface/port unless at least two adapters (e.g., production + test) are justified.

## 2. Process: Explore & Audit

1. **Read Domain Language**: Check for `CONTEXT.md`, `CONTEXT-MAP.md`, or the project's domain glossary. Read any ADRs (`docs/adr/`) in the affected area. You MUST use the project's domain language to name concepts.
2. **Explore organic friction**: Look for:
   - Where understanding one concept requires bouncing between many small modules.
   - Where modules are **shallow**.
   - Where pure functions were extracted just for testing, but real bugs hide in how they are called (poor **locality**).
   - Tightly coupled modules that leak across their seams.
   - Code that is hard to test through its current interface.
3. **Apply the deletion test** to suspected shallow modules.

## 3. Present Candidates

Present a numbered list of deepening opportunities to the user. For each candidate, show:

- **Files**: Which files/modules are involved.
- **Problem**: Why the current architecture causes friction (use exact terminology).
- **Solution**: Plain English description of what would change.
- **Benefits**: Explained in terms of locality, leverage, and testability.

*Note on ADRs*: If a candidate contradicts an existing ADR, flag it clearly ("contradicts ADR-XXX but worth reopening because..."). 

**Do NOT propose interfaces yet.** Ask the user: *"Which of these would you like to explore?"*

## 4. Deepening Strategy (Once a candidate is chosen)

When assessing how to deepen the chosen module, classify its dependencies to determine the testing strategy:

1. **In-process**: Pure computation/memory. Merge modules, test directly. No adapter needed.
2. **Local-substitutable**: DBs/filesystems with local test stand-ins (e.g., in-memory SQLite). Deepen and test with the stand-in.
3. **Remote but owned (Ports & Adapters)**: Internal microservices/APIs. Define a **port** (interface) at the **seam**. The deep module owns logic; transport is injected as an **adapter** (HTTP for prod, in-memory for tests).
4. **True external**: 3rd-party services (Stripe, Twilio). Inject as a port; tests provide a mock adapter.

## 5. Interface Design (Design It Twice)

When the user wants to explore alternative interfaces for the chosen module, use parallel exploration:

1. **Frame the problem**: Show constraints and dependencies briefly.
2. **Generate options**: Propose 2-3 **radically different** interface designs. Minor variations do not count.
   - Option A: Minimize interface (1-3 entry points, max leverage).
   - Option B: Maximize flexibility (support many use cases).
   - Option C: Optimize for the default/most common caller.
   - Option D (if useful): Move the seam completely elsewhere.
3. **Present and Compare**: Compare them by **depth**, **locality**, **seam placement**, ease of correct use, and ease of misuse.
4. **Recommend**: Give a strong, opinionated recommendation of which design is best and why.
5. **Do not implement during interface design**. This phase is about shape, trade-offs, and caller experience only.

## 6. Refactor Execution Planning

When the user approves an architecture/refactor direction, plan execution as tiny safe commits:

- Each commit must leave the codebase working.
- Separate behavior-preserving refactors from behavior changes.
- Move code before changing behavior when possible.
- Load/use `test-driven-development` for behavior changes or regression tests.
- Prefer reversible steps: rename → extract → move → deepen → delete obsolete tests.
- Delete shallow-module unit tests only after equivalent behavior is covered through the deepened module's interface.

## 7. Execution & Side Effects

Once the design is approved, transition to implementation:

- If **OpenSpec/SDD** is active, convert the design into a proposal/spec using the SDD workflow (`sdd-propose`, `sdd-spec`, `sdd-tasks`).
- If you had to invent a new domain term, update `CONTEXT.md` (ask user first).
- If the decision is hard-to-reverse, surprising, and a real trade-off, offer to write an ADR.
