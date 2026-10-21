# Observer

## Intent

Notify multiple subscribers when a subject changes without tightly coupling the subject to concrete observers.

## Forces that justify it

Requires at least two of these signals:

- One state change has multiple independent reactions.
- Subscribers join or leave dynamically.
- The publisher should depend only on a stable event contract.

## Do not use when

- Strong consistency requires all reactions in the same aggregate transaction.
- Event ordering, retries, or delivery guarantees are unspecified.
- An event bus would conceal critical control flow inside a small codebase.

## Participants

Publisher/Subject, Subscriber/Observer, ConcreteSubscribers.

## Kotlin/JVM sketch

```kotlin
data class WaitlistJoined(val email: String)

fun interface EventSubscriber<E> {
    suspend fun on(event: E)
}

class EventPublisher<E>(
    private val subscribers: List<EventSubscriber<E>>
) {
    suspend fun publish(event: E) {
        subscribers.forEach { it.on(event) }
    }
}
```

## Trade-offs

- Subscriber failures and delivery order become unspecified behavior.
- Subscribers leak memory when nothing detaches them.
- Synchronous fan-out puts reaction latency on the publisher path.

## Pattern-specific review checks

- [ ] Delivery guarantees (at-most-once, at-least-once, ordering) are documented.
- [ ] Subscriber lifecycle is explicit and unsubscribe exists.
- [ ] One failing subscriber cannot silently break the publisher or its peers.

- [ ] 

## Related patterns and simpler alternatives

Mediator, Domain Events, Reactive Streams

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/observer

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
