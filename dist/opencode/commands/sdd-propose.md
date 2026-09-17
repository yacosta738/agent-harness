---
description: Create a change proposal with intent, scope, and approach
agent: sdd-propose
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-propose/SKILL.md
and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then
follow their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Change name: {argument}
- Artifact store mode: openspec

TASK:
Create a proposal for the change. Read the exploration (if it exists) for context. Write proposal.md
with intent, scope, approach, risks, and rollback plan.

Return a structured result with: status, executive_summary, artifacts, next_recommended, and risks.
