---
name: route-assess
description: "Use when routing decision is ambiguous, complexity is unclear, or you need a structured assessment to decide between RPI (brainstorming) vs SDD full cycle. Ask questions to classify the request and recommend a lane."
---

# Route Assess — Complexity Classification Skill

Help classify an incoming request into the right lane when the routing decision is ambiguous.

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

- **1 superficie** (un archivo, un módulo isolated) → potentially RPI
- **2-3 superficies** (un workflow, configuración) → depends on coupling
- **4+ superficies** (múltiples features, servicios) → likely SDD

### Step 2: Durability Check

Ask: **"¿El cambio necesita specs durable o es para ahora?"**

- Temporary / one-off / script → RPI
- Will affect long-term behavior → SDD
- Needs to be understood by others later → SDD

### Step 3: Reversibility Check

Ask: **"¿Qué pasa si nos equivocamos?"**

- Easy to revert, low blast radius → potentially RPI
- Hard to undo, high risk → lean toward SDD

### Step 4: Coupling Check

Ask: **"¿Está aislado o depende de otras cosas?"**

- Independent, no downstream effects → potentially RPI
- Coupled to other systems → lean toward SDD

## Decision Matrix

| Surface | Durable | Reversible | Coupled | Recommended Lane |
|---------|---------|------------|---------|-----------------|
| 1 | No | Yes | No | **RPI** |
| 1 | Yes | Yes | No | RPI + light doc |
| 2-3 | No | Yes | No | **RPI** |
| 2-3 | Yes | No | Maybe | **SDD** |
| 4+ | Any | Any | Any | **SDD** |
| Unclear | Unclear | Unclear | Unclear | **Ask user** |

## Output Format

After assessment, provide:

```
## Route Assessment: [topic]

**Surface Area:** [1 / 2-3 / 4+ / unclear]
**Durability:** [needed / not needed / unclear]
**Reversibility:** [easy / hard / unclear]
**Coupling:** [isolated / coupled / unclear]

**Recommended Lane:** [RPI / SDD]
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
- **Don't ask all questions.** Use 1-2 that cut through the ambiguity.
- **Don't delay for analysis paralysis.** If you can't decide after 2 questions, ask the user directly.

## Post-Decision Memory (IMPORTANT)

**After making a routing decision, save it to Engram memory.**

Use `mem_save` immediately after the decision with:

```
type: decision
topic_key: routing/{category} (e.g., routing/github-actions, routing/config-change, routing/new-feature)
content:
  **What**: Routing decision: [RPI/SDD] for [brief task description]
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
If user asks to "update the test step in CI" and you route it as RPI, save:
- title: "Routed RPI for CI step update"
- type: decision
- topic_key: routing/github-actions
- content: "**What**: RPI for single CI step update | **Why**: Isolated change, single file, no durable specs needed | **Context**: Surface=1, Durable=no, Reversible=easy, Coupling=isolated | **User Input**: User confirmed it's a one-off fix"
