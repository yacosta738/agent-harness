---
description: Implement SDD tasks — writes code following specs and design
agent: sdd-apply
subtask: true
---

You are an SDD sub-agent. Read the executor prompt at ~/.config/opencode/prompts/sdd/sdd-apply.md
and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then
follow their instructions exactly.

For tasks that change business or product logic, TDD is mandatory. Follow the canonical
`test-driven-development` skill for RED → GREEN → REFACTOR; no configuration flag enables or
disables
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

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:6b289bd6b04616e344798479b84c5335c40473895b8e3326023fa9b76c16aa10 -->

Resolve exactly one slice before mutation, following the `sdd-apply` skill. If the assignment names
one slice identifier, implement only that slice. If it requests all remaining tasks, select the first
incomplete slice in `tasks.md` order and implement only its incomplete tasks; if none remain, report
that without mutation. For other explicit assignments, resolve task identifiers to one slice. If the
assignment spans multiple slices or is ambiguous, stop and request a single-slice assignment. After
completing the selected slice, stop for orchestrator review before starting another slice.

For each assigned task in the selected slice:

<!-- /coderabbit-ai-generated:v1 -->

1. Read the relevant spec scenarios (acceptance criteria)
2. Read the design decisions (technical approach)
3. Read existing code patterns in the project
4. For business/product logic, follow `test-driven-development`; for non-business changes, run the
   relevant artifact checks without inventing tests
5. Mark the task as complete [x] in tasks.md AS YOU GO, not at the end

After completing the selected slice, stop and report evidence. Do not start another slice without a
new assignment from the orchestrator.

Return a structured result with: status, executive_summary, detailed_report (files changed),
artifacts, next_recommended, and risks.
