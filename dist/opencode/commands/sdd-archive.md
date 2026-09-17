---
description: Archive a completed SDD change — syncs specs and closes the cycle
agent: sdd-archive
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-archive/SKILL.md
and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then
follow their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Artifact store mode: openspec

TASK:
Archive the active SDD change using the shared active change resolution rule. Read the verification
report first to confirm the change is ready. Then:

1. Sync delta specs into main specs (source of truth)
2. Move the change folder to archive with date prefix
3. Verify the archive is complete

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts,
next_recommended, and risks.
