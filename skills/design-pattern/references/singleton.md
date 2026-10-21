# Singleton

## Intent

Ensure a type has one process-wide instance and expose a controlled access point to it.

## Forces that justify it

Requires at least two of these signals:

- Exactly one stateless registry or coordinator is required per process.
- Lifecycle and concurrency semantics are explicit.
- The language/runtime can guarantee safe initialization.

## Do not use when

- The goal is merely convenient global access.
- The component owns request-, tenant-, or test-specific state.
- Dependency injection can manage scope and lifecycle more transparently.

## Participants

Singleton, Client.

## Kotlin/JVM sketch

```kotlin
object MimeTypeRegistry {
    private val values = mapOf(
        "json" to "application/json",
        "png" to "image/png"
    )

    fun resolve(extension: String): String? = values[extension.lowercase()]
}
```

## Trade-offs

- Global mutable state creates hidden coupling and test bleed.
- Lifecycle binds to the classloader or process, not to a business scope.
- Thread-safety guarantees depend on the runtime and the initialization form.

## Pattern-specific review checks

- [ ] The instance is stateless, or its state is documented as process-wide.
- [ ] DI scope was considered first and rejected with a reason.
- [ ] Tests can isolate or reset the state.

- [ ] 

## Related patterns and simpler alternatives

Dependency Injection, Service Locator, Monostate

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/singleton

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
