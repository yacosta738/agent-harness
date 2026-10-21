# Composite

## Intent

Represent part-whole hierarchies as trees and treat individual objects and compositions uniformly.

## Forces that justify it

Requires at least two of these signals:

- The domain naturally forms a recursive tree.
- Clients should apply the same operation to leaves and containers.
- Operations aggregate results recursively.

## Do not use when

- The structure is not recursive.
- Leaves and containers have fundamentally incompatible operations.
- Uniformity would expose meaningless methods on leaf nodes.

## Participants

Component, Leaf, Composite, Client.

## Kotlin/JVM sketch

```kotlin
sealed interface PriceComponent {
    fun total(): Long
}

data class LineItem(val amount: Long) : PriceComponent {
    override fun total(): Long = amount
}

data class Bundle(
    val children: List<PriceComponent>
) : PriceComponent {
    override fun total(): Long = children.sumOf(PriceComponent::total)
}
```

## Trade-offs

- The uniform interface pushes meaningless operations onto leaves.
- Recursive traversal hides cost and depth limits.
- Parent references create cycle and ownership hazards.

## Pattern-specific review checks

- [ ] Operations that make no sense on a leaf fail explicitly instead of silently doing nothing.
- [ ] Traversal has depth or cycle protection for untrusted trees.
- [ ] Aggregation semantics (sum, max, short-circuit) are documented per operation.

- [ ] 

## Related patterns and simpler alternatives

Iterator, Visitor, Decorator

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/composite

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
