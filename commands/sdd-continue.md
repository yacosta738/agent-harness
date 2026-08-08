---
description: Continue the next SDD phase in the dependency chain
agent: kerrigan
---

Follow the SDD Kerrigan workflow to continue the active change.

WORKFLOW:

1. Read `openspec/changes/{argument}/state.yaml` to determine current progress
2. If no state.yaml, check which artifacts exist (proposal.md, specs/, design.md, tasks.md,
   verify-report.md, qa-report.md)
3. Determine the next phase based on the dependency graph:
   propose → [spec + design] → tasks → apply → verify → qa → archive
4. If `verify-report.md` exists but `qa-report.md` is absent or incomplete, select `sdd-qa`.
   Never select archive before QA is complete or an explicit policy exception is recorded. QA reports
   use `PASS`, `PASS WITH WARNINGS`, `FAIL`, `BLOCKED`, or `NOT TESTED`, with `CRITICAL`, `P0`,
   `P1`, `P2`, and `P3` findings preserved for the archive gate.
5. Delegate to the appropriate sub-agent for the next phase
6. Update state.yaml after the phase completes
7. Present the result and ask the user to proceed

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Change name: {argument}
- Artifact store mode: openspec

CRITICAL: Do NOT execute phase work inline — delegate to the dedicated sub-agents defined in
opencode.json. Update state.yaml after each phase completes.
