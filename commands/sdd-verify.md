---
description: Validate implementation against specs — the quality gate
agent: sdd-verify
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd/sdd-verify/SKILL.md
and the shared protocol at ~/.config/opencode/skills/sdd/_shared/sdd-phase-common.md FIRST, then
follow their instructions exactly.

CONTEXT:

- Working directory: {workdir}
- Current project: {project}
- Artifact store mode: openspec

TASK:
Verify the active SDD change using the shared active change resolution rule. You MUST:

1. Check completeness (all tasks done?)
2. Check correctness (specs match code?)
3. Check coherence (design decisions followed?)
4. Run tests and build (real execution, not just static analysis)
5. Build the spec compliance matrix (behavioral validation)
6. Persist verify-report.md

Return a structured result with: status, executive_summary, detailed_report, artifacts,
next_recommended, and risks.
