---
description: Reverse-engineer specifications from existing source code
agent: kerrigan
---

Load the `spec-from-code` skill and execute it to reverse-engineer specifications from existing
source code.

MODE:

The command accepts an optional mode prefix in the argument:

- **Analyze** (default): Read-only investigation. No persistent artifacts. Use when you want to
  understand what a module does without creating SDD artifacts.
- **Draft**: Generate a reviewable draft spec. Requires an explicit draft name. Use when you want
  to create a baseline that can be approved and promoted.

ARGUMENT FORMAT:

- Analyze mode: `spec-from-code {scope}` or `spec-from-code analyze {scope}`
- Draft mode: `spec-from-code draft {draft-name} {scope}`

Parse the argument:
- If it starts with `draft`, parse as: `draft {draft-name} {scope}`.
- If it starts with `analyze` (case-insensitive), strip that prefix and treat the remainder as the scope.
- Otherwise, treat the entire argument as the scope in analyze mode.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Argument: {argument}
- Artifact store mode: openspec

TASK:

1. Parse the argument to determine mode (analyze or draft), optional draft name, and scope.
2. Load the `spec-from-code` skill and execute it with the parsed parameters.
3. For **analyze mode**: operate read-only — collect evidence, classify findings, and return a
   structured report without persisting artifacts.
4. For **draft mode**: require a draft name, write the draft to
   `.agents/sdd/drafts/spec-from-code/{draft-name}/draft.md`, and present it for user review.
   Drafts live outside `changes/` so they do not appear as active SDD changes.

CRITICAL: Do not invent a draft name. If draft mode is requested but no draft name is provided,
ask the user for one before proceeding.
