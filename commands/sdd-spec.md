---
description: Write or update SDD specs for a change
agent: sdd-kerrigan
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-spec/SKILL.md FIRST, then follow its instructions exactly.

CONTEXT:
- Working directory: {workdir}
- Current project: {project}
- Change name: {argument}
- Artifact store mode: openspec

TASK:
Write or update the specs for change "{argument}". Read the proposal first, then existing main specs for affected domains. Create delta specs (or full specs for new domains) inside the change folder.

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, and risks.
