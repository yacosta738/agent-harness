---
description: Create or update an SDD proposal for a change
agent: sdd-kerrigan
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-propose/SKILL.md FIRST, then follow its instructions exactly.

CONTEXT:
- Working directory: {workdir}
- Current project: {project}
- Change name: {argument}
- Artifact store mode: openspec

TASK:
Create or update the proposal for change "{argument}". Read any existing exploration and relevant main specs first. Then write or update `proposal.md`.

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, and risks.
