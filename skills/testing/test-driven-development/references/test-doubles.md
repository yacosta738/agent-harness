# Test doubles

Use a double when the real dependency makes the test slow, non-deterministic, expensive, or capable
of producing an external effect. Prefer the real dependency first, then a test environment, then a
small fake implementation. Do not simulate internal collaborators just to control every call.

| Type      | Purpose                                            | Example use                                                               |
|-----------|----------------------------------------------------|---------------------------------------------------------------------------|
| **Dummy** | Fills a parameter the scenario does not use        | A context required by an interface, irrelevant to the behavior under test |
| **Stub**  | Returns a prepared response                        | A rejection response from an external gateway                             |
| **Fake**  | Has a simplified but working implementation        | An in-memory repository that stores and retrieves data                    |
| **Spy**   | Records an interaction so it can be observed later | Confirming that a required message was sent to a specific recipient       |
| **Mock**  | Defines expectations about interactions            | Checking an external contract when the outcome alone cannot be observed   |

Do not treat all doubles as equivalent. Choose the smallest one that preserves the behavior the test
needs:

1. Use the real dependency when it is fast, deterministic, and safe.
2. Use a fake or stub when you need to control an external boundary without losing the behavior of
   the system under test.
3. Use a spy only when the interaction is part of the contract, not to inspect internal
   collaboration.
4. Use an interaction mock sparingly. If a behavior-preserving refactor breaks the test, the test
   probably verifies an internal detail.

Do not check that the double "works"; check the result of the system. Keep the shape of the prepared
data consistent with the real contract, and avoid partial responses that hide assumptions.

Do not add methods to production classes only to simplify test setup or cleanup. Put that
responsibility in test utilities, unless the lifecycle also belongs to the production contract. When
you prepare external responses, represent the fields the system consumes according to the real
schema; an incomplete double can hide an integration failure.

If configuring the double takes longer than the behavior under test, if it simulates too many
collaborators, or if you cannot explain why it is needed, try real components in an integration test
first. The test must not pass only because a double exists.

The [per-language code examples](code-examples.md) show a fake implementation that also records the
value sent to an external boundary. That observation is valid because the amount sent is part of the
checkout contract.
