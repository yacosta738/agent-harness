# Skill Resolver — Universal Protocol

Any agent that **delegates work to sub-agents** MUST use this protocol to resolve relevant skills
and pass them safely.

## Why This Exists

Sub-agents start with no project skill context. The orchestrator resolves skills once and injects
them, so sub-agents don't waste tokens searching blindly.

## When to Apply

Before every sub-agent launch that involves reading, writing, reviewing, testing, documenting, or
creating project artifacts. Skip only for purely mechanical commands.

## The Protocol

### Step 1: Obtain the Skill Registry

Resolution order:
1. Use the session cache if present.
2. Read `.atl/skill-registry.md` from the project root.
3. No registry found → proceed without project skills and note it in the delegation.

### Step 2: Match Relevant Skills

Match on two dimensions:

| Context | Match against |
|---------|---------------|
| Code/files | Registry trigger/description mentions the language, framework, tool, or path |
| Task/action | Registry trigger/description mentions actions like PR, review, docs, tests |

Prefer the smallest useful set. If more than five skills match, keep the five most relevant and
prioritize code context over task context.

### Step 3: Pass Skills to Sub-Agents

Two delivery modes (orchestrator decides which):

**Mode A: Pre-digested compact rules** (preferred for token efficiency)

```markdown
## Project Standards (auto-resolved)

{Compact rules extracted from matched skills — only the hard rules and conventions,
not the full SKILL.md content}
```

**Mode B: Exact file paths** (when skills are complex or need full context)

```markdown
## Skills to load before work

Read these exact files before reading, writing, reviewing, testing, or creating artifacts:

- /path/to/skills/typescript/SKILL.md
- /path/to/skills/go-testing/SKILL.md
```

The sub-agent MUST read those files before task-specific work. `SKILL.md` is the runtime contract.

### Step 4: Report Resolution

Sub-agents MUST report `skill_resolution` in their return envelope:

- `paths-injected` — received exact skill paths from the delegator and loaded them
- `compact-rules` — received pre-digested Project Standards block
- `fallback-registry` — no paths/rules received, self-loaded from `.atl/skill-registry.md`
- `fallback-path` — loaded an explicit fallback path
- `none` — no skills loaded

If a sub-agent reports anything other than `paths-injected` or `compact-rules`, the orchestrator
should check if the registry needs updating.

## Integration Points

- **Kerrigan (orchestrator)**: resolves paths/rules for all SDD and non-SDD delegations
- **judgment-day / double-blind-review**: resolves paths before judges and fix agents
- **Any future delegator**: use this protocol when launching sub-agents
