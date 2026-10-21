# Factory Method

## Intent

Define a creation operation through an abstraction while allowing concrete implementations to decide which product type is instantiated.

## Forces that justify it

Requires at least two of these signals:

- Client code depends on a product abstraction but object creation varies by context.
- A framework must offer extension points for creating internal components.
- Large conditional blocks choose concrete implementations during construction.

## Do not use when

- There is only one stable product implementation.
- A constructor or dependency-injection binding already solves the variability cleanly.
- Subclassing would exist only to override object creation.

## Participants

Product, ConcreteProduct, Creator, ConcreteCreator.

## Kotlin/JVM sketch

```kotlin
interface Notification { fun send(message: String) }

class EmailNotification : Notification {
    override fun send(message: String) = println("email: $message")
}

abstract class NotificationCreator {
    fun notify(message: String) = createNotification().send(message)
    protected abstract fun createNotification(): Notification
}

class EmailNotificationCreator : NotificationCreator() {
    override fun createNotification(): Notification = EmailNotification()
}
```

## Trade-offs

- Requires a creator hierarchy per product variation.
- Hides concrete type selection from readers.
- DI bindings express most variation more cheaply in JVM applications.

## Pattern-specific review checks

- [ ] Creation is the only thing the subclass overrides.
- [ ] The product contract is stable; no `is` checks on returned values.
- [ ] Unknown input fails explicitly and is tested.

- [ ] 

## Related patterns and simpler alternatives

Abstract Factory, Template Method, Dependency Injection

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/factory-method

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
