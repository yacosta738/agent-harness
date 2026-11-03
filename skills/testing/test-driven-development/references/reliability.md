# Test reliability

## Diagnose intermittent tests

A test that passes sometimes and fails other times is not a reliable signal. Reproduce the failure
and find a cause before modifying the assertions.

Check these sources:

- Clock, time zone, or date-boundary dependence.
- Randomness without a controlled seed.
- Global or shared state between tests.
- Execution order, concurrency, or data races.
- Network, external services, ports, and timeouts.
- Resources that are not cleaned up: files, processes, connections, or test data.
- Fixed waits that assume a duration instead of waiting for a condition.

Prefer an injectable clock, a reproducible seed, isolated data, explicit cleanup, and
condition-based waits. Do not add arbitrary `sleep` calls or blind retries: they can hide the cause.
A retry is only a temporary mitigation with clear follow-up, not a fix.

## Close the gap between tests and production

No suite can guarantee the system will not fail in production. Tests reduce risk; they do not
remove differences in data, infrastructure, load, or configuration.

Reduce false confidence with evidence at several levels:

- Run integration with realistic test infrastructure when the contract depends on it.
- Validate external contracts against documented responses and schemas; do not simulate only the
  fields the immediate test expects.
- Keep the test configuration as close as possible to the real configuration.
- Add E2E coverage for critical paths, not for every internal detail.
- Do not turn a mock suite into the only proof of an important integration.

To choose the right level, see [fundamentals and levels](fundamentals.md). For work on systems
without coverage, see [tests in legacy code](legacy.md).
