# Iterator

## Intent

Traverse a collection without exposing its internal representation.

## Forces that justify it

Requires at least two of these signals:

- A custom aggregate requires controlled traversal.
- Multiple traversal strategies are needed.
- Traversal state should be isolated from the collection.

## Do not use when

- Standard Kotlin `Iterable`, `Sequence`, or collection operations already solve the problem.
- Traversal leaks mutable internals.
- A custom iterator adds ceremony without domain semantics.

## Participants

Iterator, ConcreteIterator, IterableCollection, ConcreteCollection.

## Kotlin/JVM sketch

```kotlin
class PublicationBatch(
    private val publications: List<Publication>
) : Iterable<Publication> {
    override fun iterator(): Iterator<Publication> =
        publications
            .asSequence()
            .filter { it.status == Status.READY }
            .iterator()
}
```

## Trade-offs

- Custom traversal duplicates what `Sequence` already provides.
- Concurrent modification semantics must be defined explicitly.
- Extra type for what may be a single loop.

## Pattern-specific review checks

- [ ] `Iterable` or `Sequence` was evaluated and found insufficient.
- [ ] Concurrent modification behavior is documented and tested.
- [ ] The iterator does not expose mutable internals.

- [ ] 

## Related patterns and simpler alternatives

Composite, Visitor, Kotlin Sequence

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/iterator

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
