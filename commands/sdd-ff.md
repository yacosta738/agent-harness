---
description: Fast-forward all SDD planning phases — proposal through tasks
agent: sdd-kerrigan
---

Follow the SDD Kerrigan workflow to fast-forward all planning phases for change "{argument}".

WORKFLOW:
Run these sub-agents in this order:
1. sdd-propose — create the proposal
2. sdd-spec and sdd-design — run in parallel after the proposal is ready
3. sdd-tasks — break down into implementation tasks

Present a combined summary after ALL phases complete (not between each one).

CONTEXT:
- Working directory: {workdir}
- Current project: {project}
- Change name: {argument}
- Artifact store mode: openspec

Read the orchestrator instructions to coordinate this workflow. Do NOT execute phase work inline — delegate to sub-agents.
