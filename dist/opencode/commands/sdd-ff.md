---
description: Fast-forward all SDD planning phases — proposal through tasks
agent: kerrigan
---

Follow the SDD Kerrigan workflow to fast-forward all planning phases for change "{argument}".

WORKFLOW:
Run these sub-agents in strict sequence:

1. Delegate to `sdd-propose` — create the proposal
2. Delegate to `sdd-spec` AND `sdd-design` — run after proposal is ready (parallel if possible)
3. Delegate to `sdd-tasks` — break down into implementation tasks
4. Update `openspec/changes/{argument}/state.yaml` after EACH phase completes

Present a combined summary after ALL phases complete (not between each one).

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Change name: {argument}
- Artifact store mode: openspec

CRITICAL: Do NOT execute phase work inline — delegate to the dedicated sub-agents defined in
opencode.json. Update state.yaml after each phase completes.
