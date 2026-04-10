---
description: Write detailed specifications with requirements and scenarios
agent: sdd-spec
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-spec/SKILL.md and
the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then follow
their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Artifact store mode: openspec

TASK:
Write delta specs for the active change. Read the proposal first (required). Write specs with
Given/When/Then scenarios and RFC 2119 keywords.

Return a structured result with: status, executive_summary, artifacts, next_recommended, and risks.
