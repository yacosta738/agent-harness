# Prototype

## Intent

Create new objects by copying an existing prototype instead of depending on its concrete construction details.

## Forces that justify it

Requires at least two of these signals:

- Object initialization is expensive or configuration-heavy.
- Runtime-defined templates are cloned repeatedly.
- Clients should copy objects without knowing concrete classes.

## Do not use when

- Objects are immutable data classes where `copy()` already provides the required semantics.
- Deep-copy ownership rules are unclear.
- Copying identity-bearing entities could duplicate identifiers incorrectly.

## Participants

Prototype, ConcretePrototype, Client.

## Kotlin/JVM sketch

```kotlin
data class CampaignTemplate(
    val name: String,
    val channels: List<String>,
    val metadata: Map<String, String>
) {
    fun duplicate(newName: String): CampaignTemplate =
        copy(
            name = newName,
            channels = channels.toList(),
            metadata = metadata.toMap()
        )
}
```

## Trade-offs

- Deep versus shallow copy rules are easy to get wrong.
- Cloning bypasses constructors and therefore validation.
- Identity-bearing entities can end up with duplicated identifiers.

## Pattern-specific review checks

- [ ] Copying is deep where required and collections are not aliased.
- [ ] Cloned instances receive new identity values.
- [ ] `copy()` semantics are documented as shallow or deep.

- [ ] 

## Related patterns and simpler alternatives

Builder, Memento, Kotlin data-class copy

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/prototype

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
