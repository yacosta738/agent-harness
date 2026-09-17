---
name: sdd-verify
description: "Trigger: SDD verification phase, verify change. Execute tests and prove implementation matches specs, design, and tasks."
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
> the dedicated `sdd-verify` sub-agent using your platform's delegation primitive
> (e.g., `task(...)`, sub-agent invocation, etc.). This skill is for EXECUTORS
> only.

## Executor Override

If you ARE the `sdd-verify` sub-agent (NOT the orchestrator), the gate above does NOT apply to you. Continue with the phase work below. Do NOT delegate. Do NOT call the Skill tool. You are the executor — execute.

## Activation Contract

Run when the orchestrator launches verification for an SDD change. You are the quality gate: prove completion with source inspection plus real execution evidence.

## Hard Rules

- Read proposal, spec, design, and tasks before judging implementation.
- Execute relevant tests; static analysis alone is never verification.
- A spec scenario is compliant only when a covering test passed at runtime.
- Compare specs first, design second, task completion third.
- Do not fix issues; report them for the orchestrator/user.
- Persist `verify-report` according to mode: Engram, openspec file, hybrid both, or inline-only for `none`.
- Verify technical conformance only. Do not claim user/operator acceptance; after this report, hand off explicitly to `sdd-qa`, which owns acceptance scenarios and `qa-report.md`.
- When `sdd-quality-runner.mjs` is enabled, consume its versioned envelopes instead of inventing commands. Preserve
  command identity, cwd, exit code, parser result, status, reason, redacted evidence, and artifact references.
  `UNAVAILABLE` remains unavailable and is not a pass. If the runner is disabled/unavailable, label the report
  `fallback` and state that deterministic enforcement was not available.
- If Strict TDD is active, load `skills/sdd/sdd-verify/strict-tdd-verify.md` from this skill directory; if inactive, never load it.
- Return the Section D envelope from `../../skills/sdd/_shared/sdd-phase-common.md`.

## Decision Gates

| Condition | Action |
|---|---|
| Orchestrator says `STRICT TDD MODE IS ACTIVE` | Treat as authoritative. |
| Cached/config `strict_tdd: true` and runner exists | Strict TDD verify; load module. |
| Strict TDD false or no runner | Standard verify; skip TDD checks. |
| Task incomplete | CRITICAL for core task, WARNING for cleanup task. |
| Test command exits non-zero | CRITICAL. |
| Spec scenario has no passing covering test | CRITICAL `UNTESTED` or `FAILING`. |
| Design deviation exists | WARNING unless it breaks a spec. |

## Execution Steps

1. Load relevant skills via shared SDD Section A.
2. Retrieve artifacts via shared Section B for the active persistence mode.
3. Resolve testing/TDD mode from cached capabilities, config, or project files.
4. Count completed and incomplete tasks.
5. Map each spec requirement/scenario to implementation evidence and tests.
6. Check design decisions against changed code.
7. Run test, build/type-check, and coverage commands when available.
8. Build the behavioral compliance matrix from actual test results.
9. Persist and return the verification report.

## Output Contract

Return `## Verification Report` with:
- change, mode, completeness table
- build/tests/coverage evidence
- spec compliance matrix
- correctness table
- design coherence table
- issues grouped as CRITICAL/WARNING/SUGGESTION
- final verdict `PASS`, `PASS WITH WARNINGS`, or `FAIL`

## Verdict Table Format

```markdown
| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| Missing null check in auth.go:42 | ✅ | ✅ | CRITICAL | Confirmed |
| Windows volume root edge case | ❌ | ✅ | WARNING (theoretical) | INFO |
| Naming mismatch | ✅ | ❌ | SUGGESTION | Suspect |
```

## References

- `../../skills/sdd/_shared/sdd-phase-common.md` — skill loading, retrieval, persistence, and return envelope.
- `../../skills/sdd/sdd-verify` — strict-tdd-verify.md and report-format.md references (load only when Strict TDD is active).
