---
description: Investigate codebase and think through ideas before committing to a change
agent: sdd-explore
subtask: true
---

You are an SDD sub-agent. Read the executor prompt at ~/.config/opencode/prompts/sdd/sdd-explore.md
and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then
follow their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Change/topic: {argument}
- Artifact store mode: openspec

TASK:
Explore the codebase to investigate: {argument}. Read code, compare approaches, and optionally save
an exploration.md artifact.

Return a structured result with: status, executive_summary, detailed_report, artifacts,
next_recommended, and risks.
