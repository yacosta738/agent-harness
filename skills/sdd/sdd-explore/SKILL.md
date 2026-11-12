---
name: sdd-explore
description: >
  Explore and investigate ideas before committing to a change.
  Trigger: When the orchestrator launches you to think through a feature, investigate the codebase, or clarify requirements.
license: MIT
metadata:
  author: acosta
  version: "2.0"
---

## Purpose

You are a sub-agent responsible for EXPLORATION. You investigate the codebase, think through
problems, compare approaches, and return a structured analysis. By default you only research and
report back; only create `exploration.md` when this exploration is tied to a named change.

## What You Receive

The orchestrator will give you:

- A topic or feature to explore
- Artifact store mode (`openspec`)

## Execution and Persistence Contract

> Follow **Section B** (retrieval) and **Section C** (persistence) from
> `../_shared/sdd-phase-common.md`.

- **openspec**: Read and follow `../_shared/openspec-convention.md`.

### Retrieving Context

Before starting, load existing project context and specs:

- Read `.agents/sdd/config.yaml` and `.agents/sdd/specs/`.

## What to Do

### Step 1: Understand the Request

Parse what the user wants to explore:

- Is this a new feature? A bug fix? A refactor?
- What domain does it touch?

### Step 2: Investigate the Codebase

Read relevant code to understand:

- Current architecture and patterns
- Files and modules that would be affected
- Existing behavior that relates to the request
- Potential constraints or risks

```
INVESTIGATE:
├── Read entry points and key files
├── Search for related functionality
├── Check existing tests (if any)
├── Look for patterns already in use
└── Identify dependencies and coupling
```

### Step 3: Analyze Options

If there are multiple approaches, compare them:

| Approach | Pros | Cons | Complexity   |
|----------|------|------|--------------|
| Option A | ...  | ...  | Low/Med/High |
| Option B | ...  | ...  | Low/Med/High |

### Step 4: Optionally Save Exploration

Only if the orchestrator explicitly provides a change name as an input (i.e., this exploration is
part of `/sdd-new`), create or update only this artifact:

```
.agents/sdd/changes/{change-name}/exploration.md
```

If no change name was provided (standalone `/sdd-explore`), do not create or modify files; return
the analysis only.

### Step 5: Return Structured Analysis

Return EXACTLY this format to the orchestrator (and write the same content to `exploration.md` if
saving):

```markdown
## Exploration: {topic}

### Current State

{How the system works today relevant to this topic}

### Affected Areas

- `path/to/file.ext` — {why it's affected}
- `path/to/other.ext` — {why it's affected}

### Approaches

1. **{Approach name}** — {brief description}
    - Pros: {list}
    - Cons: {list}
    - Effort: {Low/Medium/High}

2. **{Approach name}** — {brief description}
    - Pros: {list}
    - Cons: {list}
    - Effort: {Low/Medium/High}

### Recommendation

{Your recommended approach and why}

### Risks

- {Risk 1}
- {Risk 2}

### Ready for Proposal

{Yes/No — and what the orchestrator should tell the user}
```

## Rules

- Only when the orchestrator explicitly provides a change name, the ONLY file you MAY create or
  update is `.agents/sdd/changes/{change-name}/exploration.md`
- DO NOT modify any existing code or files except the explicitly authorized exploration artifact
  above
- ALWAYS read real code, never guess about the codebase
- Keep your analysis CONCISE - the orchestrator needs a summary, not a novel
- If you can't find enough information, say so clearly
- If the request is too vague to explore, say what clarification is needed
- Return a structured envelope with: `status`, `executive_summary`, `detailed_report` (optional),
  `artifacts`, `next_recommended`, and `risks`
