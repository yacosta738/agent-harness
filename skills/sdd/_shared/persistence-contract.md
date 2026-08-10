# Persistence Contract (shared across all SDD skills)

## Mode Resolution

The orchestrator passes `artifact_store.mode` as `openspec`.

Default resolution (when orchestrator does not explicitly set a mode):

1. Use `openspec` for persistent storage in the filesystem

## Behavior Per Mode

| Mode       | Read from                                 | Write to   | Project files |
|------------|-------------------------------------------|------------|---------------|
| `openspec` | Filesystem (see `openspec-convention.md`) | Filesystem | Yes           |

## Common Rules

- If mode is `openspec`, write files ONLY to the paths defined in `openspec-convention.md`.
- ALWAYS use `openspec` mode.

## Active Change Resolution

When a phase needs a `{change-name}`, resolve it in this order:

1. If the orchestrator passes `Change name: {argument}`, use it.
2. Otherwise, inspect `openspec/changes/`, excluding `archive/`.
3. If exactly ONE active change directory exists, use that as the active change.
4. If more than one active change directory exists, STOP and report ambiguity to the orchestrator.
5. If no active change directory exists, STOP and report that there is no active change.

Do NOT guess the active change when multiple candidates exist.

## Return Envelope

All SDD phases MUST return the same structured envelope:

- `status`
- `executive_summary`
- `detailed_report` (optional)
- `artifacts`
- `next_recommended`
- `risks`

Commands and skills should use this exact envelope so orchestrators can consume results
consistently.

## State Persistence (Orchestrator)

The orchestrator persists DAG state after each phase transition to enable recovery and
`sdd-continue` resumption.

Write `openspec/changes/{change-name}/state.yaml` after each phase completes:

```yaml
change: {change-name}
current_phase: {last completed phase}
completed: [explore, propose, spec, design, tasks]
next: {next phase in DAG}
updated: {ISO date}
```

To recover state: read `openspec/changes/{change-name}/state.yaml`. If missing, fall back to
checking which artifact files exist in the change directory.

## Detail Level

The orchestrator may also pass `detail_level`: `concise | standard | deep`.
This controls output verbosity but does NOT affect what gets persisted — always persist the full
artifact.

## Sub-Agent Context Rules

Sub-agents launch with a fresh context and NO access to the orchestrator's instructions or memory
protocol.

**Who reads, who writes:**

| Scenario | Reads | Writes |
|----------|-------|--------|
| Non-SDD (general task) | Orchestrator searches engram, passes summary in prompt | Sub-agent saves discoveries via `mem_save` |
| SDD (phase with dependencies) | Sub-agent reads artifacts from filesystem | Sub-agent writes its artifact to filesystem |
| SDD (phase without dependencies, e.g. explore) | Nobody reads prior artifacts | Sub-agent writes its artifact to filesystem |

**Why this split:**
- Orchestrator reads for non-SDD: it knows what context is relevant; sub-agents doing their own
  searches waste tokens on irrelevant results.
- Sub-agents read for SDD: SDD artifacts are large; inlining them in the orchestrator prompt would
  consume the entire context window.
- Sub-agents always write: they have the complete detail; nuance is lost by the time results flow
  back to the orchestrator.

## Sub-Agent Response Ordering

When a sub-agent persists artifacts (via file writes or `mem_save`), the persistence MUST happen
BEFORE the final text response. The sub-agent's absolute last output must be text, never a tool
call.

**Why**: The Task tool returns the sub-agent's final output to the parent. If the sub-agent ends
with a tool call, the parent receives only the tool result — the sub-agent's text analysis is lost.

Sub-agents must NOT call `mem_session_summary` — that's reserved for top-level agents only.

## Orchestrator Prompt Instructions for Sub-Agents

### Non-SDD delegations:

```
PERSISTENCE (MANDATORY):
If you make important discoveries, decisions, or fix bugs, you MUST save them to engram before
returning:
  mem_save(title: "{short description}", type: "{decision|bugfix|discovery|pattern}",
           project: "{project}", capture_prompt: false,
           content: "{What, Why, Where, Learned}")
Do NOT return without saving what you learned. This is how the team builds persistent knowledge.
```

### SDD delegations:

```
Artifact store mode: openspec
Read artifacts from: openspec/changes/{change-name}/
Write artifacts to: openspec/changes/{change-name}/

PERSISTENCE NOTE:
- Write all artifacts to the filesystem (openspec paths).
- If you discover non-obvious insights, also call mem_save with capture_prompt: false.
- Your FINAL output must be TEXT (the return envelope), not a tool call.
```

## Skill Registry

The orchestrator pre-resolves skill paths and injects them as `## Skills to load before work` or
`## Project Standards (auto-resolved)` in the launch prompt. Sub-agents read those exact files or
apply those rules before task-specific work.

To generate/update the registry: run the `skill-registry` skill or `sdd-init`.

Sub-agent skill loading priority:
1. `## Project Standards (auto-resolved)` block → apply directly (no file reads needed)
2. `## Skills to load before work` block → read those exact `SKILL.md` files
3. `SKILL: Load` instructions → fallback
4. `.agents/skill-registry.md` → last resort
5. None found → proceed without project skills (not an error)
