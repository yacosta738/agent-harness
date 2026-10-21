# Bridge

## Intent

Separate an abstraction from its implementation so both dimensions can evolve independently.

## Forces that justify it

Requires at least two of these signals:

- Two independent axes of variation create a subclass explosion.
- Abstractions and platform/provider implementations change independently.
- Runtime implementation switching is required.

## Do not use when

- There is only one meaningful axis of variation.
- Simple composition or strategy injection is enough.
- The abstraction hierarchy adds terminology without reducing coupling.

## Participants

Abstraction, RefinedAbstraction, Implementor, ConcreteImplementor.

## Kotlin/JVM sketch

```kotlin
interface MessageSender {
    suspend fun send(recipient: String, body: String)
}

class EmailSender : MessageSender {
    override suspend fun send(recipient: String, body: String) = Unit
}

abstract class Notification(
    private val sender: MessageSender
) {
    protected suspend fun deliver(recipient: String, body: String) =
        sender.send(recipient, body)
}

class SecurityAlert(sender: MessageSender) : Notification(sender) {
    suspend fun sendTo(recipient: String) =
        deliver(recipient, "Security alert")
}
```

## Trade-offs

- Two hierarchies plus a composition seam; harder to navigate than a single class.
- Collapses into Strategy when the abstraction side has no behavior of its own.
- Requires naming discipline so refined abstractions do not duplicate implementor logic.

## Pattern-specific review checks

- [ ] Both axes vary independently; state the combinations avoided, not just the intent.
- [ ] Abstraction holds policy, implementor holds mechanism, with no overlap.
- [ ] Runtime implementor switching is a real requirement, not a speculative one.

- [ ] 

## Related patterns and simpler alternatives

Strategy, Adapter, Abstract Factory

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/bridge

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
