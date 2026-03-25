---
description: Explore and investigate an idea or feature — reads codebase and compares approaches
agent: sdd-kerrigan
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-explore/SKILL.md FIRST, then follow its instructions exactly.

CONTEXT:
- Working directory: {workdir}
- Current project: {project}
- Topic to explore: {argument}
- Artifact store mode: openspec

TASK:
Explore the topic "{argument}" in this codebase. Investigate the current state, identify affected areas, compare approaches, and provide a recommendation.

This is exploration-first — do NOT modify code. Only create `exploration.md` when this exploration is tied to a named change per the shared OpenSpec convention; otherwise just research and return your analysis.

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, and risks.
