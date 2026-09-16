---
description: Break down specs and design into implementation task checklist
agent: sdd-tasks
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-tasks/SKILL.md
and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then
follow their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Artifact store mode: openspec

TASK:
Create the task breakdown for the active change. Read proposal, specs, and design (all required).
Write tasks.md with phased, concrete, actionable tasks.

Return a structured result with: status, executive_summary, artifacts, next_recommended, and risks.
