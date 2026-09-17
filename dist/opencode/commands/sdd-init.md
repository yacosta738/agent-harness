---
description: Initialize SDD context — detects stack and creates openspec structure
agent: sdd-init
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-init/SKILL.md and
the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then follow
their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Artifact store mode: openspec

TASK:
Initialize the SDD context for this project. Detect the tech stack, create the openspec directory
structure, and generate config.yaml.

Return a structured result with: status, executive_summary, artifacts, next_recommended, and risks.
