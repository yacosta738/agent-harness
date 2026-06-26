---
name: fix-finding
description: >
  Turn a security finding into a minimal, validated code change. Use when
  the user explicitly asks to fix a validated or plausible security
  finding. Follows TDD: write a failing regression test FIRST, then the
  smallest fix that makes it pass, then run the focused suite. Do not use
  to scan, discover, or triage — those are separate skills.
license: MIT
---

# Security Fix Finding

## Objective

Turn a security finding into a minimal, validated code change when the
issue still exists. If the issue is already fixed, prove that with focused
validation and report no code change was needed.

The result includes the fix if one was needed, focused regression tests or
another repeatable validation check, proof that normal behavior still works,
and proof that the original issue no longer reproduces.

## Inputs

Start by extracting any available finding details:

- Title and affected component.
- Vulnerable source, sink, or broken control.
- Attacker-controlled input.
- Expected security invariant.
- Impact and required preconditions.
- Existing PoC, reproducer, test, or validation evidence.
- Files and line references.

If a critical field is missing, inspect the repository to fill it from
code evidence. Ask the user only when the fix would otherwise require
guessing a product policy or security invariant.

## Workflow

1. **Scope the fix.**
   - Inspect the affected files and the smallest set of supporting files
     needed to understand the vulnerable path.
   - Before editing, establish that the reported weakness is concretely
     reachable in the checked-out code. Generic weakness labels and
     suspicious-looking code are not proof.
   - If the same broken security boundary cannot be shown after a bounded
     investigation, do not patch an adjacent weakness or add speculative
     defense in depth. Return `no_change` when evidence shows the path is
     already safe; otherwise return `blocked` with the missing proof.
   - Identify the narrowest code boundary where the security invariant
     should be enforced.
   - Check for existing helpers, validators, permission checks,
     sanitizers, policy objects, and test patterns before adding new
     ones.
2. **Reproduce or encode the issue before fixing.**
   - TDD: write a failing test FIRST. The test must fail on `main` and
     pass after the fix.
   - Prefer a failing regression test, unit test, integration test,
     property test, or realistic-interface reproduction.
   - If runtime reproduction is not feasible, create the strongest
     bounded static or harness-based validation artifact available and
     document the proof gap.
   - Do not keep a test that exercises unsafe behavior unless it is safe,
     deterministic, and appropriate for the repository.
   - If the issue no longer reproduces before any code changes,
     investigate whether it was already fixed and preserve the validation
     evidence.
3. **Generate the fix.**
   - Make the smallest behavior change that enforces the intended
     invariant.
   - Avoid broad refactors. Prefer local, established abstractions
     unless a larger change is required to enforce the security
     invariant.
   - Preserve existing APIs unless changing the API is the security fix.
   - Handle error paths explicitly. Do not silently accept unsafe input.
   - Skip code changes when repository evidence and validation show the
     finding is already fixed.
4. **Add repeatable validation.**
   - Confirm the failing test now passes.
   - Include positive coverage for legitimate behavior that should still
     work.
   - Add tests at the lowest level that proves the invariant, plus an
     interface-level test when the vulnerable path is externally
     reachable and feasible.
5. **Validate the fix works.**
   - Run the focused tests that cover the changed code.
   - Run the original PoC or reproducer, if one exists, and confirm it
     no longer succeeds.
   - Re-check the original source-to-sink or broken-control path in the
     fixed code.
   - Search nearby call sites or variants that might bypass the new
     control.
   - Confirm the regression test would fail if the fix were removed,
     when practical.
   - Run any relevant unit tests, integration tests, formatter, linter,
     type checker, package-specific dependency check, and other
     repository checks normally required for the touched files.
6. **Report the outcome** with exact commands, results, changed files,
   and remaining risk.

## Output Contract

Return a Markdown summary with:

- `outcome`: one of `fixed`, `no_change`, `blocked`.
- `summary`: one-paragraph description of the fix.
- `files_changed`: list of paths.
- `tests_or_validation_added`: list of paths.
- `commands_run`: list of `{command, result, exit_code}` entries.
- `original_issue_no_longer_reproduces`: explicit statement of how this
  was shown.
- `remaining_uncertainty`: list of proof gaps or skipped validations.
- `commit_message`: conventional-commit message describing the fix.

If the scan had a `findings/<candidate_id>/` directory, also write a
visible report to `fix_report.md` there.

## Hard Rules

Read `_shared/shared-hard-rules.md` first.

- TDD is mandatory: write or adjust a failing test FIRST, then implement
  the minimum code to pass, then refactor safely.
- Do not claim the issue is fixed until the changed code AND the original
  vulnerable path have both been checked.
- Do not rely only on code inspection when a focused test or reproducer
  is feasible.
- Do not give up on runtime validation at the first missing dependency,
  generated file, or setup error. Repair the validation path with
  targeted commands before giving up.
- Do not broaden scope into unrelated cleanup.
- Do not remove user changes or unrelated local modifications.
- Do not weaken authentication, authorization, tenant isolation, input
  validation, sandboxing, or logging to make tests pass.
- Do not hide proof gaps. If the environment blocks validation, say
  exactly which command or setup failed and what evidence is still
  missing.
- No Co-Authored-By trailers or AI attribution on the commit.