---
description: Implement SDD tasks — writes code following specs and design
agent: sdd-apply
subtask: true
---

You are an SDD sub-agent. Read the executor prompt at ~/.config/opencode/prompts/sdd/sdd-apply.md
and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then
follow their instructions exactly.

For tasks that change business or product logic, TDD is mandatory. Follow the canonical
`test-driven-development` skill for RED → GREEN → REFACTOR; no configuration flag enables or disables
TDD. For documentation, generated files, and non-business configuration, CI, infrastructure, or
automation, run relevant artifact checks without inventing TDD tests. If a business-logic task has
no runnable test command, stop and report it as blocked.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Artifact store mode: openspec

TASK:
Find the active SDD change artifacts (proposal, specs, design, tasks) using the shared active change
resolution rule. Read them to understand what needs to be implemented.

Implement the remaining incomplete tasks. For each task:

1. Read the relevant spec scenarios (acceptance criteria)
2. Read the design decisions (technical approach)
3. Read existing code patterns in the project
4. For business/product logic, follow `test-driven-development`; for non-business changes, run the relevant
   artifact checks without inventing tests
5. Mark the task as complete [x] in tasks.md AS YOU GO, not at the end

Return a structured result with: status, executive_summary, detailed_report (files changed),
artifacts, next_recommended, and risks.
