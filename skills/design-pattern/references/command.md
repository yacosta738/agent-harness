# Command

## Intent

Encapsulate a request as an object so it can be queued, logged, retried, authorized, or undone.

## Forces that justify it

Requires at least two of these signals:

- Operations cross process, queue, transaction, or audit boundaries.
- Invocation must be decoupled from execution.
- Requests need metadata, idempotency, retry, or history.

## Do not use when

- A direct method call is sufficient.
- Commands are anemic wrappers with no operational benefit.
- Command objects are incorrectly reused as mutable domain entities.

## Participants

Command, ConcreteCommand, Invoker, Receiver, Client.

## Kotlin/JVM sketch

```kotlin
data class PublishPost(
    val publicationId: String,
    val idempotencyKey: String
)

class PublishPostHandler(
    private val publisher: Publisher
) {
    suspend fun handle(command: PublishPost) {
        publisher.publish(
            publicationId = command.publicationId,
            idempotencyKey = command.idempotencyKey
        )
    }
}
```

## Trade-offs

- One type per request; the type count grows quickly.
- Serialization, versioning, and idempotency add real operational cost.
- Duplicates the domain signature when no queue, audit trail, or undo exists.

## Pattern-specific review checks

- [ ] The command carries everything needed to execute, including the idempotency key.
- [ ] The handler is idempotent or explicitly documented as non-idempotent.
- [ ] Commands are immutable and never reused as domain entities.
- [ ] Retry and failure semantics are defined at the boundary, not implied.

- [ ] 

## Related patterns and simpler alternatives

CQRS, Memento, Event Sourcing

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/command

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
