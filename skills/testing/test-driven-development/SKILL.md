---
name: test-driven-development
description: Use this skill to change business or product behavior in RPI or SDD, to fix defects in that logic, or when the user requests TDD, Red–Green–Refactor, test design, coverage, test doubles, intermittent-test diagnosis, or tests for legacy code.
license: MIT
---

# Test-driven development

## Principle

Use tests to describe the behavior the contract requires, not the internal structure that implements
it. A behavior-preserving refactor must not force the tests to be rewritten.

## When to use it

- TDD is mandatory in RPI and SDD when a task changes business or product logic, including features,
  behavioral defects, and refactors of that logic. The project cannot switch it off.
- For new or modified behavior, write a failing test first and complete RED → GREEN → REFACTOR. For
  a
  behavior-preserving refactor, start from existing tests that protect the contract, or add a
  characterization test before refactoring.
- Do not use TDD for documentation, generated code, or configuration, CI, infrastructure, or
  automation changes that contain no business or product logic. Run the validation that fits those
  artifacts, and do not invent tests without signal.
- If a script or workflow implements business logic, use TDD for that logic and validate its
  configuration or packaging separately.
- If a task must change business or product logic and no runnable test runner exists, stop that part
  of the work and ask to configure or identify a runner. Do not replace TDD with tests written
  afterward.
- Before changing code, review the project instructions, the domain vocabulary, and the nearest
  architecture decisions.

## Red–Green–Refactor cycle

1. **Define the observable outcome.** Identify the requirement and the appropriate public boundary.
   Choose the layer that provides useful signal without making the test broader than necessary.
   Explain the chosen boundary; ask only if the contract or the scope is unclear.
2. **RED — write one test for one behavior.** Use the public interface and an expected result that
   is
   independent of the implementation. Run the test. Confirm that it fails because the behavior is
   missing, not because of syntax or configuration errors. If it passes because the behavior already
   exists, treat the case as characterization and consult `references/legacy.md` when appropriate.
3. **GREEN — implement the minimum.** Change only what the test requires. Run the test again.
4. **REFACTOR — clean up without changing behavior.** Remove duplication or clarify names. Keep the
   tests green and run them again after refactoring.
5. **Repeat in vertical slices.** Advance one behavior per cycle; do not write the whole test suite
   before you understand what each result teaches.

Use the runner and commands the project already defines. Run the affected test first, then the
relevant project validation. Do not report RED or GREEN without the output that proves it.

## Load references only when they apply

Do not read every reference when the skill loads. Choose the ones that answer the current question.

| Need                                                                    | Reference                                                  |
|-------------------------------------------------------------------------|------------------------------------------------------------|
| Define a test unit, choose levels, or interpret coverage                | [Fundamentals and test levels](references/fundamentals.md) |
| Improve structure, naming, AAA/GWT, single responsibility, or test data | [Test design and readability](references/test-design.md)   |
| Choose between Dummy, Stub, Fake, Spy, and Mock                         | [Test doubles](references/test-doubles.md)                 |
| Diagnose flakiness or reduce false confidence signals                   | [Test reliability](references/reliability.md)              |
| Add tests to uncovered code or refactor legacy code                     | [Tests in legacy code](references/legacy.md)               |
| Agree on TDD practice across a team                                     | [Team workflow](references/team-workflow.md)               |
| Consult code examples per language                                      | [Code examples](references/code-examples.md)               |
