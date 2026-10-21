# Abstract Factory

## Intent

Create families of related or compatible objects without coupling clients to their concrete classes.

## Forces that justify it

Requires at least two of these signals:

- Several products must vary together as a coherent family.
- Mixing implementations from different families would be invalid.
- The application supports multiple platforms, providers, brands, or environments.

## Do not use when

- Only one product varies.
- Families are not required to remain mutually compatible.
- Adding a new product type is more frequent than adding a new family.

## Participants

AbstractFactory, ConcreteFactory, AbstractProducts, ConcreteProducts, Client.

## Kotlin/JVM sketch

```kotlin
interface Button { fun render(): String }
interface Dialog { fun render(): String }

interface UiFactory {
    fun button(): Button
    fun dialog(): Dialog
}

class DarkUiFactory : UiFactory {
    override fun button() = object : Button {
        override fun render() = "dark button"
    }
    override fun dialog() = object : Dialog {
        override fun render() = "dark dialog"
    }
}
```

## Trade-offs

- Every new product type touches every factory and every family.
- Clients depend on a factory abstraction even when only one family ships today.
- A DI container or a configuration map expresses family selection more cheaply in most JVM applications.

## Pattern-specific review checks

- [ ] Every product produced by the factory is consumed by the same client workflow.
- [ ] Adding a new family requires no change to client code.
- [ ] Products from different families are never mixed inside one client.

- [ ] 

## Related patterns and simpler alternatives

Factory Method, Builder, Prototype

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/abstract-factory

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
