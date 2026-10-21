# Facade

## Intent

Expose a focused, simplified interface over a complex subsystem.

## Forces that justify it

Requires at least two of these signals:

- Clients coordinate many subsystem classes in a repeated sequence.
- A stable application-facing API should shield internal complexity.
- Layer boundaries need an explicit entry point.

## Do not use when

- The facade becomes a god object containing domain logic.
- Advanced clients need capabilities hidden by the facade and no escape hatch exists.
- The underlying subsystem is already simple and cohesive.

## Participants

Facade, Subsystem classes, Client.

## Kotlin/JVM sketch

```kotlin
class MediaFacade(
    private val validator: MediaValidator,
    private val storage: MediaStorage,
    private val metadata: MetadataRepository
) {
    suspend fun upload(command: UploadMedia): MediaId {
        validator.validate(command.bytes, command.contentType)
        val stored = storage.store(command.bytes)
        metadata.save(stored.id, command.contentType)
        return stored.id
    }
}
```

## Trade-offs

- Turns into a god object once domain rules accumulate.
- Hides capabilities that advanced clients still need.
- One more layer to keep synchronized with the subsystem.

## Pattern-specific review checks

- [ ] The facade orchestrates; domain rules stay in the domain.
- [ ] An escape hatch exists for clients that need subsystem detail.
- [ ] Every facade method maps to a real client use case.

- [ ] 

## Related patterns and simpler alternatives

Adapter, Application Service, Mediator

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/facade

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
