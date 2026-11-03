---
name: route-assess
description: "Use when routing is genuinely ambiguous between Direct, Delegated direct, and Explicit SDD."
---

# Route Assess — Complexity Classification Skill

Help classify an incoming request into the lightest safe RPI route when the routing decision is
ambiguous. Do not use this skill for an exact, mechanical edit with no unresolved design choice;
classify that as Direct and proceed. SDD is never automatic.

**Trigger:** When you detect complexity ambiguity or when explicitly invoked via auto-load.

## When to Use This Skill

Use this skill when ANY of these are true:

- The request could be a "quick fix" OR the start of something bigger
- You see signals of hidden complexity but can't be sure
- The user said "simple" but the codebase suggests otherwise
- You're about to default to SDD but it might actually be simpler
- The request touches multiple surfaces but you're unsure if they're tightly coupled
- You need a structured way to explain your routing decision to the user

## The Assessment Process

### Step 1: Surface Area Analysis

Ask: **"How many parts of the system does this touch?"**

- **1 surface** (one isolated behavior) → Direct
- **2-3 surfaces** (a workflow, configuration) → Direct or Delegated direct
- **4+ surfaces** (multiple features, services) → Delegated direct unless Explicit SDD is
  requested

Count independently changing behaviors, not files. Updating one exact default across repeated
module declarations is one surface. Multiple files alone never force SDD.

### Step 2: Durability Check

Ask: **"Do we need a durable specification to decide or coordinate this change?"**

- Exact requested outcome, no unresolved trade-off → Direct
- Temporary design reasoning or a scoped choice → brainstorming inside RPI
- Durable product contract, approval gates, or resumable coordination → ask whether Explicit SDD is
  wanted

Do not confuse **persistent code** with **a need for durable specification**. Almost every committed
change persists. Long-term behavior alone is not an SDD signal.

### Step 3: Reversibility Check

Ask: **"What happens if we get this wrong?"**

- Easy to revert, low blast radius → Direct if no design choice remains; otherwise use internal
  brainstorming within RPI
- Hard to undo, high risk → strengthen verification/review; do not infer SDD

### Step 4: Coupling Check

Ask: **"Is it isolated, or does it depend on other things?"**

- Independent, no downstream effects → Direct or Delegated direct
- Coupled to other systems → Delegated direct, unless durable SDD artifacts are explicitly requested

## Decision Matrix

| Behavioral surface           | Design choice             | Reversible | Coupled contract | Recommended Lane                                      |
|------------------------------|---------------------------|------------|------------------|-------------------------------------------------------|
| 1, even if repeated in files | None; exact edit supplied | Yes        | No               | **Direct**                                            |
| 1                            | Small/temporary           | Yes        | No               | **Direct**                                            |
| 2-3                          | Small/temporary           | Yes        | Low              | **Delegated direct** when fresh context helps         |
| 2-3                          | Durable/ambiguous         | Any        | Yes              | **Ask whether Explicit SDD is wanted**                |
| 4+                           | Any                       | Any        | Any              | **Delegated direct** unless Explicit SDD is requested |
| Unclear                      | Unclear                   | Unclear    | Unclear          | **Ask user**                                          |

### SDD Admission Check

Before recommending SDD, name the durable artifact or coordination problem it solves and confirm
that the user wants it. Otherwise remain in RPI. Never start `sdd-propose` merely because a config
value affects runtime behavior, the task is large, or risk is high.

## Output Format

After assessment, provide:

```
## Route Assessment: [topic]

**Surface Area:** [1 / 2-3 / 4+ / unclear]
**Durability:** [needed / not needed / unclear]
**Reversibility:** [easy / hard / unclear]
**Coupling:** [isolated / coupled / unclear]

**Recommended Lane:** [Direct / Delegated direct / Explicit SDD]
**Confidence:** [high / medium / low]

**Reasoning:** [2-3 sentences explaining why]

**Question to User:** [if confidence is low, ask a clarifying question]
```

## Questions to Ask (one at a time)

Use these when assessment is unclear:

1. **"Is this a one-off fix or the start of something bigger?"**
2. **"Do we need to keep specs for this later, or is it for now?"**
3. **"Does it affect other parts of the system, or is it isolated?"**
4. **"What happens if we need to change this tomorrow?"**

## Anti-Patterns

- **Don't over-assess.** If it's clearly simple or clearly complex, just state it and act.
- **Don't equate file count with surface area.** Repeated declarations can represent one change.
- **Don't equate persistence with specs.** A committed default value is durable code, not
  automatically a durable design decision.
- **Don't ask all questions.** Use 1-2 that cut through the ambiguity.
- **Don't delay for analysis paralysis.** If you can't decide after 2 questions, ask the user
  directly.

## Post-Decision Memory (IMPORTANT)

**After making a routing decision, save it to Engram memory.**

Use `mem_save` immediately after the decision with:

```
type: decision
topic_key: routing/{category} (e.g., routing/github-actions, routing/config-change, routing/new-feature)
content:
  **What**: Routing decision: [Direct/Delegated direct/Explicit SDD] for [brief task description]
  **Why**: [main reason for this lane choice]
  **Context**: [surface area, durability, reversibility, coupling assessment]
  **User Input**: [any clarifying questions the user answered that influenced the decision]
```

**Why this matters:**

- Future similar requests can be routed faster
- Pattern recognition across sessions
- Accountability for routing choices
- Builds institutional memory of what "simple" vs "complex" looks like in this project

**Example:**
If the user names a variable, supplies its new default, and asks to apply it to all equivalent
module declarations, route Direct: the edit is mechanically specified, bounded, and reversible.
Use focused validation, not `sdd-propose`. If the correct default or rollout semantics are still
undecided, use brainstorming inside RPI to resolve that choice first. Use Explicit SDD only after
the user requests or accepts durable artifacts.

If user asks to "update the test step in CI" and you route it as Delegated direct, save:

- title: "Routed delegated direct for CI step update"
- type: decision
- topic_key: routing/github-actions
- content: "**What**: Delegated direct for single CI step update | **Why**: Fresh context helps
  verify the workflow without durable specs | **Context**: Surface=1, Durable=no, Reversible=easy,
  Coupling=isolated"
