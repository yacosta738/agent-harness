---
name: route-assess
description: "Use when routing is genuinely ambiguous or complexity is unclear between Direct, RPI (brainstorming), and a full SDD cycle."
---

# Route Assess — Complexity Classification Skill

Help classify an incoming request into the lightest safe lane when the routing decision is
ambiguous. Do not use this skill for an exact, mechanical edit with no unresolved design choice;
classify that as Direct and proceed.

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

Ask: **"¿Cuántas partes del sistema toca esto?"**

- **1 superficie** (un comportamiento aislado) → Direct or RPI
- **2-3 superficies** (un workflow, configuración) → depends on coupling
- **4+ superficies** (múltiples features, servicios) → likely SDD

Count independently changing behaviors, not files. Updating one exact default across repeated
module declarations is one surface. Multiple files alone never force SDD.

### Step 2: Durability Check

Ask: **"¿Necesitamos una especificación durable para decidir o coordinar este cambio?"**

- Exact requested outcome, no unresolved trade-off → Direct
- Temporary design reasoning or a scoped choice → RPI
- Durable product contract, approval gates, or resumable coordination → SDD

Do not confuse **persistent code** with **a need for durable specification**. Almost every committed
change persists. Long-term behavior alone is not an SDD signal.

### Step 3: Reversibility Check

Ask: **"¿Qué pasa si nos equivocamos?"**

- Easy to revert, low blast radius → Direct if no design choice remains; otherwise RPI
- Hard to undo, high risk → lean toward SDD

### Step 4: Coupling Check

Ask: **"¿Está aislado o depende de otras cosas?"**

- Independent, no downstream effects → Direct or RPI
- Coupled to other systems → lean toward SDD

## Decision Matrix

| Behavioral surface | Design choice | Reversible | Coupled contract | Recommended Lane |
|--------------------|---------------|------------|------------------|-----------------|
| 1, even if repeated in files | None; exact edit supplied | Yes | No | **Direct** |
| 1 | Small/temporary | Yes | No | **RPI** |
| 2-3 | Small/temporary | Yes | Low | **RPI** |
| 2-3 | Durable/ambiguous | No | Yes | **SDD** |
| 4+ | Durable coordination needed | Any | Yes | **SDD** |
| Unclear | Unclear | Unclear | Unclear | **Ask user** |

### SDD Admission Check

Before recommending SDD, name the durable artifact or coordination problem it solves. If you
cannot name one, SDD is not justified. Use Direct when no design choice remains; otherwise start
with RPI. Never start `sdd-propose` merely because a config value affects runtime behavior.

## Output Format

After assessment, provide:

```
## Route Assessment: [topic]

**Surface Area:** [1 / 2-3 / 4+ / unclear]
**Durability:** [needed / not needed / unclear]
**Reversibility:** [easy / hard / unclear]
**Coupling:** [isolated / coupled / unclear]

**Recommended Lane:** [Direct / RPI / SDD]
**Confidence:** [high / medium / low]

**Reasoning:** [2-3 sentences explaining why]

**Question to User:** [if confidence is low, ask a clarifying question]
```

## Questions to Ask (one at a time)

Use these when assessment is unclear:

1. **"¿Esto es un fix puntual o el inicio de algo más grande?"**
2. **"¿Necesitamos guardar specs de esto para después o es para ahora?"**
3. **"¿Afecta a otras partes del sistema o está aislado?"**
4. **"¿Qué pasa si mañana necesitamos cambiar esto?"**

## Anti-Patterns

- **Don't over-assess.** If it's clearly simple or clearly complex, just state it and act.
- **Don't equate file count with surface area.** Repeated declarations can represent one change.
- **Don't equate persistence with specs.** A committed default value is durable code, not
  automatically a durable design decision.
- **Don't ask all questions.** Use 1-2 that cut through the ambiguity.
- **Don't delay for analysis paralysis.** If you can't decide after 2 questions, ask the user directly.

## Post-Decision Memory (IMPORTANT)

**After making a routing decision, save it to Engram memory.**

Use `mem_save` immediately after the decision with:

```
type: decision
topic_key: routing/{category} (e.g., routing/github-actions, routing/config-change, routing/new-feature)
content:
  **What**: Routing decision: [Direct/RPI/SDD] for [brief task description]
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
undecided, use RPI to resolve that choice first.

If user asks to "update the test step in CI" and you route it as RPI, save:
- title: "Routed RPI for CI step update"
- type: decision
- topic_key: routing/github-actions
- content: "**What**: RPI for single CI step update | **Why**: Isolated change, single file, no durable specs needed | **Context**: Surface=1, Durable=no, Reversible=easy, Coupling=isolated | **User Input**: User confirmed it's a one-off fix"
