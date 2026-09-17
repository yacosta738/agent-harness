# SDD Phase — Common Protocol

Boilerplate identical across all SDD phase skills. Sub-agents MUST follow this alongside their
phase-specific SKILL.md.

Executor boundary: every SDD phase agent is an EXECUTOR, not an orchestrator. Do the phase work
yourself. Do NOT launch sub-agents, do NOT call `delegate`/`task`, and do NOT bounce work back
unless the phase skill explicitly says to stop and report a blocker.

## A. Skill Loading

1. Check if the orchestrator injected a `## Project Standards (auto-resolved)` block in your launch
   prompt. If yes, follow those rules — they are pre-digested compact rules. **Do NOT read any
   additional SKILL.md files.**
2. If no Project Standards block was provided, check for `SKILL: Load` instructions. If present,
   load those exact skill files.
3. If neither was provided, check for a skill registry:
   a. Read `.agents/skill-registry.md` from the project root if it exists.
   b. From the registry's **Compact Rules** section, apply rules whose triggers match your current
   task.
4. If no registry exists, proceed with your phase skill only.

NOTE: the preferred path is (1) — compact rules pre-injected by the orchestrator. Paths (2) and (3)
are fallbacks for backwards compatibility.

## B. Artifact Retrieval (OpenSpec Mode)

Read artifacts from the filesystem using the paths defined in `openspec-convention.md`:

```
Proposal:   openspec/changes/{change-name}/proposal.md
Specs:      openspec/changes/{change-name}/specs/  (all domain subdirectories)
Design:     openspec/changes/{change-name}/design.md
Tasks:      openspec/changes/{change-name}/tasks.md
Verify:     openspec/changes/{change-name}/verify-report.md
QA:         openspec/changes/{change-name}/qa-report.md
Config:     openspec/config.yaml
Main specs: openspec/specs/{domain}/spec.md
```

If a required artifact is missing, STOP and return `status: blocked` with a clear message about
what's missing.

## C. Artifact Persistence (OpenSpec Mode)

Every phase that produces an artifact MUST persist it to the filesystem. Skipping this BREAKS the
pipeline — downstream phases will not find your output.

Write artifacts to the paths defined in `openspec-convention.md`. The file was already written
during the phase's main step — no additional action needed beyond confirming the write succeeded.

**Critical rules:**

- ALWAYS create the change directory before writing artifacts
- If a file already exists, READ it first and UPDATE it (don't overwrite blindly)
- If the change directory already exists with artifacts, the change is being CONTINUED

## D. Return Envelope

Every phase MUST return a structured envelope to the orchestrator:

- `status`: `success`, `partial`, or `blocked`
- `executive_summary`: 1-3 sentence summary of what was done
- `detailed_report`: (optional) full phase output, or omit if already inline
- `artifacts`: list of artifact paths written
- `next_recommended`: the next SDD phase to run, or "none"
- `risks`: risks discovered, or "None"

Example:

```markdown
**Status**: success
**Summary**: Proposal created for `{change-name}`. Defined scope, approach, and rollback plan.
**Artifacts**: `openspec/changes/{change-name}/proposal.md`
**Next**: sdd-spec or sdd-design
**Risks**: None
**Skill Resolution**: paths-injected — 3 skills (react-19, typescript, tailwind-4)
```

### Response Ordering (CRITICAL)

Your FINAL output MUST be text (the return envelope), NOT a tool call. If you need to save anything
to Engram (e.g., discoveries via `mem_save`), do it BEFORE your final text response.

**Why**: When a sub-agent's last action is a tool call, the parent agent receives only the tool
result — your text response (the actual analysis) is lost.

### Sub-Agent Boundaries

- Do NOT call `mem_session_summary` — that is reserved for the top-level orchestrator only.
- If you make important discoveries during your work, save them via `mem_save` with
  `capture_prompt: false` (SDD artifacts are automated pipeline outputs, not human-initiated saves).
- Your job is to execute the phase, persist artifacts to filesystem, and return the envelope.

### Skill Resolution Field

The return envelope MUST include `skill_resolution` reporting how skills were loaded:

- `paths-injected` — received exact skill paths from orchestrator and loaded them
- `fallback-registry` — no paths received, self-loaded from `.agents/skill-registry.md`
- `fallback-path` — loaded via explicit `SKILL: Load` instruction
- `none` — no project skills loaded (proceed with phase skill only)

## E. Review Workload Guard

SDD must protect reviewer cognitive load, not only generate tasks.

- The default PR review budget is **400 changed lines** (`additions + deletions`).
- The orchestrator caches a delivery strategy at session start: `ask-on-risk` (default),
  `auto-chain`, `single-pr`, or `exception-ok`.
- The orchestrator passes `delivery_strategy` to `sdd-tasks` and the resolved decision to
  `sdd-apply`.
- `sdd-tasks` MUST forecast whether the planned work may exceed that budget.
- The forecast MUST include exact plain-text guard lines: `Decision needed before apply: Yes|No`,
  `Chained PRs recommended: Yes|No`, and `400-line budget risk: Low|Medium|High`.
- If the forecast is high, `sdd-tasks` MUST recommend chained or stacked PRs using deliverable work
  units.
- `sdd-apply` MUST NOT start oversized work unless the delivery strategy resolves to chained/stacked
  PR slices or explicitly accepted `size:exception`.
- Each chained PR slice must have a clear start, clear finish, autonomous scope, verification, and
  reasonable rollback.

This guard exists to reduce reviewer burnout and keep implementation delivery safe. Do not treat it
as optional process noise.
