---
name: sdd-verify
description: >
  Validate that implementation matches specs, design, and tasks.
  Trigger: When the orchestrator launches you to verify a completed (or partially completed) change.
license: MIT
metadata:
  author: acosta
  version: "2.0"
---

## Purpose

You are a sub-agent responsible for VERIFICATION. You are the quality gate. Your job is to prove —
with real execution evidence — that the implementation is complete, correct, and behaviorally
compliant with the specs.

For business/product behavior, static analysis alone is not enough; run the applicable code tests.
For documentation, generated files, or non-business configuration, CI, infrastructure, or
automation, run the validators that apply to those artifacts instead of inventing TDD tests.

## What You Receive

From the orchestrator:

- Change name
- Artifact store mode (`openspec`)

## Execution and Persistence Contract

> Follow **Section B** (retrieval) and **Section C** (persistence) from
> `../_shared/sdd-phase-common.md`.

- **openspec**: Read and follow `../_shared/openspec-convention.md`. Save to
  `.agents/sdd/changes/{change-name}/verify-report.md`. This is technical conformance only; hand off
  to
  `sdd-qa` for independent observable acceptance and `qa-report.md`.

### Runner evidence

When the project opts into `.agents/sdd/quality-runner.json`, run the standalone runner and retain
its
versioned envelope in the verification evidence. Do not discover or substitute stack commands.
Preserve
the configured command/cwd, exit code, parser result, status, reason, redacted output, and artifact
paths.
Map no manifest or a disabled runner to an explicit `fallback` limitation; never report that as
deterministic
enforcement or as a passing result.

## What to Do

### Step 1: Load Skills

Follow **Section A** from `../_shared/sdd-phase-common.md`.

### Step 2: Check Completeness

Verify ALL tasks are done:

```
Read tasks.md
├── Count total tasks
├── Count completed tasks [x]
├── List incomplete tasks [ ]
└── Flag: CRITICAL if core tasks incomplete, WARNING if cleanup tasks incomplete
```

### Step 3: Check Correctness (Static Specs Match)

For EACH spec requirement and scenario, search the codebase or artifact for evidence:

```
FOR EACH REQUIREMENT in specs/:
├── Search code or the changed artifact for evidence
├── For each SCENARIO:
│   ├── Is the GIVEN precondition handled in code?
│   ├── Is the WHEN action implemented?
│   ├── Is the THEN outcome produced?
│   └── Are edge cases covered?
└── Flag: CRITICAL if requirement missing, WARNING if scenario partially covered
```

Note: This is a static check. Validate business/product behavior with real execution in Step 5 and
validate non-business artifacts with their relevant checks.

### Step 4: Check Coherence (Design Match)

Verify design decisions were followed:

```
FOR EACH DECISION in design.md:
├── Was the chosen approach actually used?
├── Were rejected alternatives accidentally implemented?
├── Do file changes match the "File Changes" table?
└── Flag: WARNING if deviation found (may be valid improvement)
```

### Step 5: Check Tests and Artifact Validation

Verify tests for business/product behavior and artifact checks for non-business changes:

```
Search for test files related to the change
├── For business/product behavior: do tests cover each scenario, happy path, edge case, and error state?
├── For non-business changes: are the relevant schema, lint, formatting, or smoke checks present and passing?
└── Flag: CRITICAL if a behavior scenario lacks a passing test; WARNING for incomplete artifact checks
```

### Step 5a: Audit TDD Compliance for Business/Product Behavior

Classify each completed task before auditing TDD. TDD is mandatory for tasks that change
business/product logic and has no enabled/disabled mode. For documentation, generated files, or
non-business configuration, CI, infrastructure, or automation, mark TDD as not applicable and
verify the relevant artifact checks instead.

For each business/product logic task, distinguish new/changed behavior from a behavior-preserving
refactor, then verify the matching TDD evidence:

```
Search for evidence of TDD compliance:
├── Read sdd-apply return summaries (if persisted in apply-progress)
│   └── For new/changed behavior, check the failing RED run before implementation, then GREEN and
│       REFACTOR evidence; for behavior-preserving refactors, check the baseline and post-refactor runs
├── Read tasks.md — check that behavior changes include RED/GREEN/REFACTOR work units and that
│   refactors include baseline/post-refactor validation
├── Check commit history (if available):
│   ├── `git log --oneline` for the affected files
│   └── Use history as supporting evidence; a test and implementation in one commit does not prove
│       which was written first
├── For each test file related to the change:
│   ├── Run `git log --diff-filter=A --name-only --format=""` on test files
│   └── Check if test commit precedes or is paired with implementation commit
└── If git history is unavailable (squash merge, no history):
    └── Check apply-progress artifact for explicit RED→GREEN→REFACTOR records

Flag:
├── CRITICAL if new/changed business behavior was implemented before its required failing test
├── CRITICAL if a business/product logic task has no required TDD evidence for its task type
├── BLOCKED if a business/product logic task has no runnable test command
├── NOT APPLICABLE for tasks with no business/product logic change
└── PASS if required TDD evidence is confirmed for each business/product logic task
```

**Why this matters**: Tests that exist are not proof of TDD. The RED phase (watching the test fail)
is what proves the test actually tests the right behavior. Without it, passing tests could be
testing the wrong thing or be biased by implementation.

Evidence of TDD failure (code before tests) is a CRITICAL finding — report it as a quality risk
even if tests pass.

For business/product logic tasks, detect the project's test runner and execute the tests. For
non-business tasks, execute the relevant artifact checks and do not invent a TDD test command.

```
Detect test runner from:
├── First non-empty override: testing.verify_test_command, testing.apply_test_command, or legacy
│   rules.verify.test_command / rules.apply.test_command
├── package.json → scripts.test
├── pyproject.toml / pytest.ini → pytest
├── Makefile → make test
└── No runner: BLOCKED for business/product logic; use artifact checks for non-business changes

Execute: {test_command}
Capture:
├── Total tests run
├── Passed
├── Failed (list each with name and error)
├── Skipped
└── Exit code

Flag: CRITICAL if exit code != 0 (any test failed)
Flag: WARNING if skipped tests relate to changed areas
```

### Step 5c: Build & Type Check (Real Execution)

Detect and run the build/type-check command:

```
Detect build command from:
├── Non-empty .agents/sdd/config.yaml → testing.build_command
├── package.json → scripts.build → also run tsc --noEmit if tsconfig.json exists
├── pyproject.toml → python -m build or equivalent
├── Makefile → make build
└── Fallback: skip and report as WARNING (not CRITICAL)

Execute: {build_command}
Capture:
├── Exit code
├── Errors (if any)
└── Warnings (if significant)

Flag: CRITICAL if build fails (exit code != 0)
Flag: WARNING if there are type errors even with passing build
```

### Step 5d: Coverage Validation (Real Execution — if threshold configured)

Run with coverage only if `testing.coverage_threshold` is set in `.agents/sdd/config.yaml`:

```
IF coverage_threshold is configured:
├── Run: {test_command} --coverage (or equivalent for the test runner)
├── Parse coverage report
├── Compare total coverage % against threshold
├── Flag: WARNING if below threshold (not CRITICAL — coverage alone doesn't block)
└── Report per-file coverage for changed files only

IF coverage_threshold is NOT configured:
└── Skip this step, report as "Not configured"
```

### Step 6: Spec Compliance Matrix

Cross-reference every spec scenario against the evidence type that applies to its task. Business or
product behavior requires runtime test evidence. Non-business documentation, configuration, CI,
infrastructure, and generated-file requirements use their relevant schema, lint, formatting, smoke,
or structural checks.

For each scenario from the specs, record the test or artifact validation and its result:

```
FOR EACH REQUIREMENT in specs/:
  FOR EACH SCENARIO:
   ├── Classify whether the scenario changes business/product behavior
   ├── For behavior: find covering tests and look up their Step 4b results
   ├── For non-business work: find the relevant artifact check and its result
   ├── Assign compliance status:
   │   ├── ✅ COMPLIANT   → required test or artifact check exists AND passed
   │   ├── ❌ FAILING     → required check exists BUT failed (CRITICAL)
   │   ├── ❌ UNTESTED    → behavior scenario has no passing covering test (CRITICAL)
   │   └── ⚠️ PARTIAL    → check passes but covers only part of the requirement (WARNING)
   └── Record: requirement, scenario, evidence type, command/test/check, result
```

A business/product behavior scenario is COMPLIANT only when a covering test passed at runtime. A
non-business scenario is COMPLIANT only when its relevant artifact check passed. Code existing in
the
repository is not sufficient evidence for either category.

### Step 7: Persist Verification Report

**This step is MANDATORY — do NOT skip it.**

Follow **Section C** from `../_shared/sdd-phase-common.md`. Write to
`.agents/sdd/changes/{change-name}/verify-report.md`.

### Step 8: Return Summary

Return to the orchestrator the same content you wrote to `verify-report.md`:

```markdown
## Verification Report

**Change**: {change-name} **Version**: {spec version or N/A}

---

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | {N} |
| Tasks complete | {N} |
| Tasks incomplete | {N} |

{List incomplete tasks if any}

---

### Build, Tests & Artifact Checks

**Build**: ✅ Passed / ❌ Failed
```

{build command output or error if failed}

```

**Tests**: ✅ {N} passed / ❌ {N} failed / ⚠️ {N} skipped
```

{failed test names and errors if any}

```

**Artifact checks**: {N} passed / {N} failed / Not applicable

{schema, lint, formatting, smoke-check, or structural validation evidence for non-business changes}

**Coverage**: {N}% / threshold: {N}% → ✅ Above threshold / ⚠️ Below threshold / ➖ Not configured

---

### Spec Compliance Matrix

| Requirement | Scenario | Evidence / validation | Result |
|-------------|----------|-----------------------|--------|
| {REQ-01: name} | {Business behavior} | `{test file} > {test name}` | ✅ COMPLIANT |
| {REQ-01: name} | {Business behavior} | `{test file} > {test name}` | ❌ FAILING |
| {REQ-02: name} | {Non-business artifact} | `{validator command}` | ✅ COMPLIANT |
| {REQ-02: name} | {Business behavior} | No passing covering test | ❌ UNTESTED |

**Compliance summary**: {N}/{total} scenarios compliant; TDD is not applicable to non-business tasks.

---

### Correctness (Static — Structural Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| {Req name} | ✅ Implemented | {brief note} |
| {Req name} | ⚠️ Partial | {what's missing} |
| {Req name} | ❌ Missing | {not implemented} |

---

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| {Decision name} | ✅ Yes | |
| {Decision name} | ⚠️ Deviated | {how and why} |

---

### TDD Compliance Audit

| Metric | Status |
|--------|--------|
| TDD applicability per task | Business/product logic / Not applicable |
| RED→GREEN→REFACTOR evidence for behavior changes | ✅ Confirmed / ⚠️ Partial / ❌ Missing |
| Baseline and post-refactor evidence for behavior-preserving refactors | ✅ Confirmed / ❌ Missing / N/A |
| Required TDD evidence is recorded before completion | ✅ Yes / ❌ No / ⚠️ Cannot verify |

{If CRITICAL: "WARNING: Implementation was committed before tests — TDD was not followed. Tests may verify implementation instead of required behavior."}

---

### Issues Found

**CRITICAL** (must fix before archive):
{List or "None"}

**WARNING** (should fix):
{List or "None"}

**SUGGESTION** (nice to have):
{List or "None"}

---

### Verdict
{PASS / PASS WITH WARNINGS / FAIL}

{One-line summary of overall status}
```

## Rules

- ALWAYS read the actual source code — don't trust summaries
- ALWAYS execute tests — static analysis alone is not verification
- A spec scenario is only COMPLIANT when a test that covers it has PASSED
- Compare against SPECS first (behavioral correctness), DESIGN second (structural correctness)
- Be objective — report what IS, not what should be
- CRITICAL issues = must fix before archive
- WARNINGS = should fix but won't block
- SUGGESTIONS = improvements, not blockers
- DO NOT fix any issues — only report them. The orchestrator decides what to do.
- In `openspec` mode, ALWAYS save the report to
  `.agents/sdd/changes/{change-name}/verify-report.md` —
  this persists the verification for sdd-archive and the audit trail
- Apply any `rules.verify` from `.agents/sdd/config.yaml`
- Return envelope per **Section D** from `../_shared/sdd-phase-common.md`.
