# Fundamentals and test levels

## What "unit" means in a unit test

A unit is a behavior with meaning of its own, not necessarily an isolated class or function. The test
observes that behavior through a public boundary. It may use real internal collaborators; isolate
external dependencies only when they add cost, non-determinism, or side effects that do not belong to
the test.

## Test levels

The pyramid is a heuristic for balancing speed against realism, not a fixed quota:

| Level       | What it verifies                                                        | Typical use                                                                                |
|-------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| Unit        | One behavior through a small public boundary                            | Many fast tests for business rules and decisions                                           |
| Integration | Real collaboration between components or with test infrastructure       | Fewer tests to catch configuration, persistence, and cross-module contract errors          |
| E2E         | One representative path from a user entry point to an outcome           | Few critical paths, because they are usually slower and more expensive to diagnose         |

Manual testing complements automation. It is not another level of the pyramid and does not replace
reproducible regressions.

Choose the smallest level that demonstrates the requirement with sufficient confidence. Move up a
level when the risk lives in collaboration, infrastructure, or the complete path.

## Code coverage

Do not turn 100% coverage into a universal goal. Coverage shows which code the tests executed; it
does not prove the assertions are correct or that they validate the requirement.

Use coverage to find areas without signal. Prioritize critical behaviors, decisions, boundaries,
errors, and product risks. An executed line without a meaningful expectation is not quality evidence.

For per-language examples, see [code examples](code-examples.md).
