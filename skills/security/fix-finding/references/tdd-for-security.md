# TDD for Security Fixes

Security fixes are the highest-value place to actually do TDD. A finding
without a regression test is a finding that will regress.

## Why TDD for security

- A security fix without a test is unverifiable. Without a failing test
  on `main`, you cannot prove the fix is what closed the bug.
- A security fix without a test will be reverted by a future refactor.
  The test is the durable artifact that survives refactors.
- A security fix without a test cannot be ported safely. When the same
  bug class appears in another module, the test is the spec for the fix.

## The discipline

1. **Red.** Write the smallest failing test that exercises the
   vulnerability. The test must fail on the current code. Do not write
   the fix yet.
2. **Green.** Write the minimum code change that makes the test pass.
   Resist the urge to refactor or add defense in depth on this step.
3. **Refactor.** Clean up the fix while keeping the test green. Look for
   sibling call sites and decide explicitly whether to fix each or
   document why not.

## Choosing the test layer

- **Unit test** when the bug is in a pure function (validator,
  sanitizer, query builder, parser).
- **Integration test** when the bug spans the boundary between two
  components (handler + storage, deserializer + sink).
- **End-to-end test** when the bug is only reachable through a real
  interface (HTTP handler with auth middleware, webhook receiver,
  parser fronting an untrusted format).
- **Property test** when the input space is large and the invariant
  generalizes (e.g. "this sanitizer never emits shell metacharacters").
- **Static or harness-based artifact** when no test harness fits. Mark
  the proof gap explicitly and keep the artifact reproducible.

## What NOT to do

- Do not skip the failing test because "the fix is obvious". The fix is
  the only thing less obvious than the test.
- Do not write a test that passes both before and after the fix. That
  test proves nothing.
- Do not commit a fix that disables the failing test. The test is the
  regression net.
- Do not write a test that requires unsafe setup (real secrets, real
  network, real production data). If the test cannot be safe, the bug
  needs a different test layer or a static artifact.