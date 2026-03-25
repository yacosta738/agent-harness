---
description: Create or update SDD technical design for a change
agent: sdd-kerrigan
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-design/SKILL.md FIRST, then follow its instructions exactly.

CONTEXT:
- Working directory: {workdir}
- Current project: {project}
- Change name: {argument}
- Artifact store mode: openspec

TASK:
Create or update the technical design for change "{argument}". Read the proposal, specs, and relevant codebase areas first. Then write or update `design.md`.

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, and risks.
