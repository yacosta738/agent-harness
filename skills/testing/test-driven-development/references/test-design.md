# Test design and readability

## Verify behavior, not internal structure

Describe what a caller of the module can observe. Prefer results, public state, or external effects
that are part of the contract. Avoid testing private methods, internal calls, counts, and
collaboration order when those details are not an observable requirement.

The expected value must have an independent source: a known value, a worked example, or the
contract. Do not reimplement the same algorithm inside the test to compute the expectation.

## One behavior per test

Apply single responsibility to the reason a test exists: it validates one observable behavior and
has one primary reason to fail. It may contain several assertions if all of them explain the same
outcome. Do not mix independent behaviors just to reduce the number of tests.

## Arrange–Act–Assert and Given–When–Then

Use **Arrange–Act–Assert (AAA)** as the default structure unless the project already uses a
behavior convention such as GWT:

1. **Arrange:** prepare the scenario and the relevant data.
2. **Act:** execute the operation under test once.
3. **Assert:** check the observable result.

**Given–When–Then (GWT)** expresses a similar idea in scenario language: given a context, when an
action occurs, then a result is observed. If the team uses GWT, keep that convention. Do not
duplicate both structures in the same test.

## Names and data

- Name the behavior and the expected result; avoid names such as `works` or `test1`.
- Make the setup reveal only the data that changes the scenario.
- Prefer explicit values and fixture functions with scenario names.
- `Object Mother` can help when it represents valid, recognizable states. Do not turn it into a
  global factory with hidden defaults or dozens of optional parameters.
- Keep the setup local if sharing it makes the test depend on mutable state or hidden configuration.

For runnable examples that show an external boundary, see [code examples](code-examples.md).
