# Template Method

## Intent

Define the invariant skeleton of an algorithm while allowing subclasses to customize selected steps.

## Forces that justify it

Requires at least two of these signals:

- Several algorithms share the same ordered workflow.
- Only specific steps differ between implementations.
- The sequence must remain controlled by the base abstraction.

## Do not use when

- Composition with Strategy is more flexible.
- Subclass hooks create fragile inheritance.
- The algorithm does not have a genuinely invariant skeleton.

## Participants

AbstractClass, ConcreteClasses, Template operation, Primitive operations, Hooks.

## Kotlin/JVM sketch

```kotlin
abstract class ImportJob {
    suspend fun run() {
        val raw = read()
        val validated = validate(raw)
        persist(validated)
        afterPersist(validated)
    }

    protected abstract suspend fun read(): List<String>
    protected open fun validate(rows: List<String>): List<String> = rows
    protected abstract suspend fun persist(rows: List<String>)
    protected open suspend fun afterPersist(rows: List<String>) = Unit
}
```

## Trade-offs

- Inheritance couples subclasses to the base lifecycle.
- Fragile base class: changing step order breaks subclasses.
- Hooks proliferate and turn into optional-behavior traps.

## Pattern-specific review checks

- [ ] The template method is final; only steps are overridable.
- [ ] Step order and failure behavior are documented.
- [ ] Strategy composition was considered and rejected with a reason.

- [ ] 

## Related patterns and simpler alternatives

Factory Method, Strategy, Hooks

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/template-method

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
