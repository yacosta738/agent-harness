---
name: composite
description: >
  Apply, review, or refactor code using the Composite design pattern.
  Use this skill when the problem matches the pattern's structural forces,
  especially in Kotlin/JVM backend systems. Do not force the pattern when a
  simpler language or framework feature is sufficient.
---

# Composite

## Objective

Represent part-whole hierarchies as trees and treat individual objects and compositions uniformly.

## Trigger conditions

Use this skill when at least two of these signals are present:

- The domain naturally forms a recursive tree.
- Clients should apply the same operation to leaves and containers.
- Operations aggregate results recursively.

Do not select the pattern from its name alone. First identify the design forces,
the axis of change, the ownership of state, and the required lifecycle.

## Do not use when

- The structure is not recursive.
- Leaves and containers have fundamentally incompatible operations.
- Uniformity would expose meaningless methods on leaf nodes.

## Canonical participants

Component, Leaf, Composite, Client.

## Decision workflow

1. Describe the concrete design problem without naming a pattern.
2. Identify what varies and what must remain stable.
3. Establish the client-facing contract.
4. Assign each responsibility to a participant.
5. Prefer composition over inheritance unless inheritance is intrinsic to the pattern.
6. Preserve domain invariants and dependency direction.
7. Implement the smallest viable version.
8. Add tests proving substitutability, collaboration, and failure behavior.
9. Compare the result with a simpler alternative.
10. Record why this pattern is justified.

## Kotlin implementation guidance

- Prefer immutable values and constructor injection.
- Use `sealed interface` or `sealed class` where the implementation set is closed.
- Use `fun interface` for single-operation strategies, factories, handlers, or observers.
- Use coroutines for asynchronous boundaries; do not expose blocking behavior as `suspend`.
- Avoid Java-style ceremony when Kotlin language features already encode the intent.
- Keep framework annotations at adapters or composition roots when possible.
- Make concurrency, cancellation, idempotency, and error semantics explicit.

## Reference implementation

```kotlin
sealed interface PriceComponent {
    fun total(): Long
}

data class LineItem(val amount: Long) : PriceComponent {
    override fun total(): Long = amount
}

data class Bundle(
    val children: List<PriceComponent>
) : PriceComponent {
    override fun total(): Long = children.sumOf(PriceComponent::total)
}
```

The example is intentionally minimal. Adapt naming and boundaries to the domain;
do not copy it as production architecture without evaluating lifecycle, failures,
observability, and concurrency.

## Review checklist

- [ ] The problem contains the forces this pattern is intended to resolve.
- [ ] The abstraction is stable and meaningful to clients.
- [ ] Concrete implementations remain substitutable.
- [ ] Domain logic has not leaked into infrastructure wrappers.
- [ ] Error handling and lifecycle semantics are explicit.
- [ ] Tests cover each concrete participant and the client contract.
- [ ] The implementation is simpler than the conditional or coupling it replaces.
- [ ] A standard Kotlin, Spring, or library mechanism would not be clearer.

## Testing strategy

- Contract-test every interchangeable implementation.
- Test client behavior against fakes through the abstraction.
- Verify invalid state, ordering, and failure propagation.
- Add concurrency tests where instances or shared state cross coroutine boundaries.
- Use integration tests only for adapter/framework behavior; keep pattern semantics unit-testable.

## Common failure modes

- Pattern-first design: selecting a named pattern before understanding the problem.
- Ceremony without variability: interfaces and classes that have only one permanent implementation.
- Leaky abstractions: clients depend on concrete implementation details.
- Hidden operational semantics: latency, retries, transactions, or thread safety are obscured.
- Misplaced business rules: orchestration wrappers become the actual domain model.

## Output expected from the agent

When applying this skill, produce:

1. A force analysis.
2. A pattern-fit verdict: `APPLY`, `CONSIDER`, or `REJECT`.
3. The proposed participants mapped to domain names.
4. A minimal implementation plan.
5. Kotlin code or a patch.
6. Tests.
7. Trade-offs and rejected alternatives.
8. Migration and rollback notes when refactoring existing code.

## Related patterns and alternatives

Iterator, Visitor, Decorator

## Source basis

Derived from the classic GoF pattern catalog and the public pattern description at:
`https://refactoring.guru/design-patterns/composite`.

Do not reproduce proprietary diagrams or paid content. Use the source for conceptual
orientation and create original domain-specific explanations and examples.
