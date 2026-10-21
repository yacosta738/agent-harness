# Decorator

## Intent

Add responsibilities to an object dynamically by wrapping it with objects implementing the same contract.

## Forces that justify it

Requires at least two of these signals:

- Behavior must be composed at runtime.
- Subclass combinations would grow combinatorially.
- Cross-cutting behavior should wrap a narrow interface.

## Do not use when

- Ordering between decorators is undocumented or unsafe.
- The wrapper changes the semantic contract unexpectedly.
- Framework middleware, interceptors, or AOP already provide a clearer mechanism.

## Participants

Component, ConcreteComponent, BaseDecorator, ConcreteDecorators.

## Kotlin/JVM sketch

```kotlin
interface DocumentStore {
    suspend fun save(id: String, content: ByteArray)
}

class DatabaseDocumentStore : DocumentStore {
    override suspend fun save(id: String, content: ByteArray) = Unit
}

class AuditedDocumentStore(
    private val delegate: DocumentStore
) : DocumentStore {
    override suspend fun save(id: String, content: ByteArray) {
        println("saving $id")
        delegate.save(id, content)
    }
}
```

## Trade-offs

- Deep wrapper stacks obscure identity, equality, and log output.
- Application order changes behavior; undocumented order is a defect.
- Each wrapper adds a delegation frame and a place for failures to hide.

## Pattern-specific review checks

- [ ] Wrapper order is documented and enforced at construction.
- [ ] Each decorator preserves the wrapped contract, including failure behavior.
- [ ] No decorator swallows or rewrites delegate errors silently.

- [ ] 

## Related patterns and simpler alternatives

Proxy, Chain of Responsibility, Middleware

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/decorator

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
