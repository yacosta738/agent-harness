---
description: Create technical design with architecture decisions and approach
agent: sdd-design
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-design/SKILL.md
and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then
follow their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Artifact store mode: openspec

TASK:
Create the technical design for the active change. Read the proposal first (required). Write
design.md with architecture decisions, data flow, file changes, and testing strategy.

Return a structured result with: status, executive_summary, artifacts, next_recommended, and risks.
