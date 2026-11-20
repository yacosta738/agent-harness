---
description: Reverse-engineer specifications from existing source code
agent: spec-from-code
subtask: true
---

You are an SDD sub-agent. Read the executor prompt at ~/.config/opencode/prompts/sdd/spec-from-code.md
and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then
follow their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Scope: {argument}
- Artifact store mode: openspec

TASK:
Analyze the bounded scope to reverse-engineer specifications from existing source code: {argument}.
Collect evidence, classify findings, and produce a reviewable draft specification.

Return a structured result with: status, executive_summary, detailed_report, artifacts,
next_recommended, and risks.
