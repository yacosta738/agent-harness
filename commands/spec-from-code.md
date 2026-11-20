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
- **Draft**: Generate a reviewable draft spec. Requires an explicit change name. Use when you want
  to create a baseline that can be approved and promoted.

ARGUMENT FORMAT:

- Analyze mode: `spec-from-code {scope}` or `spec-from-code analyze {scope}`
- Draft mode: `spec-from-code draft {change-name} {scope}`

If the argument starts with `draft`, parse it as: `draft {change-name} {scope}`.
Otherwise, treat the entire argument as the scope in analyze mode.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Argument: {argument}
- Artifact store mode: openspec

TASK:

1. Parse the argument to determine mode (analyze or draft), optional change name, and scope.
2. Load the `spec-from-code` skill and execute it with the parsed parameters.
3. For **analyze mode**: operate read-only — collect evidence, classify findings, and return a
   structured report without persisting artifacts.
4. For **draft mode**: require a change name, write the draft to
   `.agents/sdd/changes/{change-name}/drafts/spec-from-code-draft.md`, and present it for user
   review. Do not place the draft inside `specs/` — `sdd-archive` iterates that directory and may
   pick up unapproved drafts.

CRITICAL: Do not invent a change name. If draft mode is requested but no change name is provided,
ask the user for one before proceeding.
