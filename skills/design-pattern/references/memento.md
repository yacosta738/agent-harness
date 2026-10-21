# Memento

## Intent

Capture and restore an object's internal state without exposing its representation.

## Forces that justify it

Requires at least two of these signals:

- Undo, rollback, snapshots, or checkpoints are required.
- The originator must retain encapsulation.
- State snapshots have clear ownership and lifecycle.

## Do not use when

- Snapshots contain large graphs without retention controls.
- Persistent event sourcing is required instead of in-memory undo.
- Sensitive internal state would be exposed or serialized unsafely.

## Participants

Originator, Memento, Caretaker.

## Kotlin/JVM sketch

```kotlin
data class DraftSnapshot internal constructor(
    internal val title: String,
    internal val body: String
)

class Draft {
    var title: String = ""
    var body: String = ""

    fun snapshot() = DraftSnapshot(title, body)

    fun restore(snapshot: DraftSnapshot) {
        title = snapshot.title
        body = snapshot.body
    }
}
```

## Trade-offs

- Snapshot size grows with state and needs a retention policy.
- Sensitive state lands in memory or in storage.
- Partial snapshots restore a state that violates invariants.

## Pattern-specific review checks

- [ ] The snapshot is immutable and captures a consistent state.
- [ ] Retention and eviction are defined by count, bytes, or TTL.
- [ ] Sensitive fields are excluded or encrypted.
- [ ] `restore` revalidates invariants instead of trusting the snapshot.

- [ ] 

## Related patterns and simpler alternatives

Command, Prototype, Event Sourcing

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/memento

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
