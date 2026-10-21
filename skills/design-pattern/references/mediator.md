# Mediator

## Intent

Centralize communication between collaborating components so they do not depend directly on one another.

## Forces that justify it

Requires at least two of these signals:

- Many components reference each other in a dense dependency graph.
- Interaction rules change independently from component behavior.
- A coordinator can make workflows explicit.

## Do not use when

- The mediator becomes an unbounded god object.
- Simple event publication or direct composition is clearer.
- Domain invariants become detached from the aggregate that owns them.

## Participants

Mediator, ConcreteMediator, Components.

## Kotlin/JVM sketch

```kotlin
sealed interface EditorEvent {
    data object ContentChanged : EditorEvent
    data object PublishRequested : EditorEvent
}

class EditorMediator(
    private val validator: ContentValidator,
    private val publisher: Publisher
) {
    suspend fun on(event: EditorEvent) {
        when (event) {
            EditorEvent.ContentChanged -> validator.revalidate()
            EditorEvent.PublishRequested -> publisher.publish()
        }
    }
}
```

## Trade-offs

- The central coordinator grows into a god object without an enforced bound.
- Indirection hides which component triggers which reaction.
- Becomes a single point of change and a single point of failure.

## Pattern-specific review checks

- [ ] The mediator coordinates; it does not own the domain rules of its components.
- [ ] Component count and event types are bounded, with a stated growth limit.
- [ ] Each event maps to known handlers, so reactions remain traceable.

- [ ] 

## Related patterns and simpler alternatives

Observer, Facade, Application Service

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/mediator

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
