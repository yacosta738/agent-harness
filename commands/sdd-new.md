---
description: Start a new SDD change — runs exploration then creates a proposal
agent: kerrigan
---

Follow the SDD Kerrigan workflow for starting a new change named "{argument}".

WORKFLOW:

1. Create the change directory: `openspec/changes/{argument}/`
2. Delegate to `sdd-explore` sub-agent to investigate the codebase
3. Present the exploration summary to the user and WAIT for approval
4. Delegate to `sdd-propose` sub-agent to create a proposal
5. Update `openspec/changes/{argument}/state.yaml` with completed phases
6. Present the proposal summary and ask the user if they want to continue

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Change name: {argument}
- Artifact store mode: openspec

CRITICAL: Do NOT execute phase work inline — delegate to the dedicated sub-agents defined in
opencode.json. Update state.yaml after each phase completes.
