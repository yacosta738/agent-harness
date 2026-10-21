# Strategy

## Intent

Encapsulate interchangeable algorithms behind a common contract and select one independently from the client.

## Forces that justify it

Requires at least two of these signals:

- Several algorithms solve the same responsibility.
- Algorithm selection varies by configuration or runtime context.
- Conditional branches select behavior rather than represent domain states.

## Do not use when

- Only one algorithm exists and no variability is expected.
- The strategy interface exposes implementation details.
- Clients must understand too many strategies to choose safely.

## Participants

Strategy, ConcreteStrategies, Context.

## Kotlin/JVM sketch

```kotlin
fun interface SlugStrategy {
    fun create(value: String): String
}

class LowercaseSlugStrategy : SlugStrategy {
    override fun create(value: String): String =
        value.lowercase().replace(" ", "-")
}

class SlugService(
    private val strategy: SlugStrategy
) {
    fun create(value: String): String = strategy.create(value)
}
```

## Trade-offs

- The client must choose a strategy, so selection logic can leak into callers.
- Adds an interface when only one implementation exists.
- A single-method interface is often just a lambda.

## Pattern-specific review checks

- [ ] Selection lives in one place (factory or DI), not scattered across callers.
- [ ] A contract test verifies every implementation behaves the same way.
- [ ] No implementation is selected through an `is` check.

- [ ] 

## Related patterns and simpler alternatives

State, Template Method, Policy Object

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/strategy

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
