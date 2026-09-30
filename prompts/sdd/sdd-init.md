---
name: sdd-init
description: "Trigger: sdd init, iniciar sdd, openspec init. Initialize SDD context, testing capabilities, registry, and persistence."
disable-model-invocation: true
user-invocable: false
license: MIT
metadata:
  author: gentleman-programming
  version: "3.0"
  delegate_only: true
---

> **ORCHESTRATOR GATE**: If you loaded this skill via the `skill()` tool, you are
> the ORCHESTRATOR — STOP. Do NOT execute these instructions inline. Delegate to
> the dedicated `sdd-init` sub-agent using your platform's delegation primitive
> (e.g., `task(...)`, sub-agent invocation, etc.). This skill is for EXECUTORS
> only.

## Executor Override

If you ARE the `sdd-init` sub-agent (NOT the orchestrator), the gate above does NOT apply to you. Continue with the phase work below. Do NOT delegate. Do NOT call the Skill tool. You are the executor — execute.

## Activation Contract

Run this phase when the orchestrator/user asks to initialize SDD in a project. You are the phase executor: do the work yourself, do not delegate, and do not behave like the orchestrator.

## Hard Rules

- Detect the real stack, conventions, architecture, testing tools, and persistence mode; never guess.
- In `engram` mode, do **not** create `.agents/sdd/`.
- In `openspec` mode, follow `../../skills/sdd/_shared/openspec-convention.md` and write file artifacts.
- In `hybrid` mode, do both Engram and openspec persistence.
- Always persist testing capabilities separately as `sdd/{project}/testing-capabilities` or `.agents/sdd/config.yaml` `testing:`.
- Always build `.agents/skill-registry.md`; also save `skill-registry` to Engram when available.
- Use `capture_prompt: false` for automated SDD/config saves when supported; omit it if the tool schema lacks it.
- Inspect both `.agents/sdd/` and the legacy `openspec/` path before initializing.
- When filesystem persistence is selected and only `openspec/` exists, move that whole directory to
  `.agents/sdd/`, preserving config, specs, active changes, archives, quality-runner files, and
  historical artifact contents. Verify the result and report the migration.
- In filesystem persistence mode, if both paths exist, do not overwrite, merge, or delete files.
  Report path collisions and differences, then return `status: blocked` and ask the orchestrator to
  resolve them. Do not
  initialize persistence, resolve downstream SDD work, or continue to another phase until resolved.
- If `.agents/sdd/` exists without `openspec/`, report what exists and ask before updating it.
- In `engram` or `none` mode, leave a legacy `openspec/` directory untouched.

## Decision Gates

| Input | Action |
|---|---|
| `mode=engram` | Save context and capabilities to Engram only. |
| `mode=openspec` | Create/update openspec bootstrap files only. |
| `mode=hybrid` | Do both Engram and openspec persistence. |
| `mode=none` | Return detected context only; write no SDD artifacts except registry if required. |
| Strict TDD marker or `rules.apply.tdd` found | Use the explicit value before considering runner fallback. |
| no marker/config but test runner exists | Default `strict_tdd: true`. |
| no test runner | Set `strict_tdd: false` and explain unavailable. |

## Execution Steps

1. Inspect project files (`package.json`, `go.mod`, `pyproject.toml`, CI, lint/test config) and both SDD artifact locations; summarize stack/conventions.
2. Detect test runner, test layers, coverage, linter, type checker, and formatter.
3. Resolve/migrate SDD artifact locations before selecting configuration. When filesystem
   persistence applies and only `openspec/` exists, migrate it first; if both directories exist,
   return `status: blocked` with the conflict report and stop. In `engram` or `none` mode, do not
   migrate legacy files.
4. Resolve Strict TDD in this order: explicit agent marker; Boolean `rules.apply.tdd` in
   `.agents/sdd/config.yaml`; Boolean `rules.apply.tdd` in legacy `openspec/config.yaml` if that is
   the only available SDD config (read it without moving files in `engram`/`none` mode); detected
   test-runner fallback (`true` when a runner exists); then `false` when no runner exists. An
   explicit config value of `false` also takes precedence over runner detection. When both configs
   exist without a filesystem migration, prefer `.agents/sdd/config.yaml`.
5. Initialize persistence for the resolved mode.
6. Build `.agents/skill-registry.md` using the skill-registry scan rules.
7. Persist testing capabilities and project context.
8. Return the structured initialization envelope.

## Output Contract

Return `status`, `executive_summary`, `artifacts`, `next_recommended`, and `risks`. Include project, stack, persistence mode, Strict TDD status, testing capability table, saved observation IDs/paths, registry path, and next `/sdd-explore` or `/sdd-new` step.

## References

- `../../skills/sdd/_shared/sdd-phase-common.md` — shared protocol for retrieval, persistence, and return envelope.
- `../../skills/sdd/_shared/openspec-convention.md` — openspec layout and rules.
