---
description: Run capability-driven acceptance QA and persist qa-report.md
agent: sdd-qa
subtask: true
---

You are an SDD sub-agent. Read the executor prompt at ~/.config/opencode/prompts/sdd/sdd-qa.md and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then follow their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Change name: {argument}
- Artifact store mode: openspec

TASK:
Run acceptance QA independently from technical verification. Read the proposal, delta specs, design, tasks, verify-report.md when present, state.yaml, and config. Resolve available capabilities from the target and environment, record selected and rejected capabilities, run only observable scenarios supported by the target, and persist `openspec/changes/{argument}/qa-report.md`.

QA MUST NOT modify product or harness code. If no target or executable capability exists, return `NOT TESTED` with explicit untested scope and reason; use `BLOCKED` for external constraints. Static inspection alone MUST NOT produce PASS. Return the Section D envelope with the report verdict, evidence, limitations, and risks.
