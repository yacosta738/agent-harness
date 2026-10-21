# Visitor

## Intent

Add operations to a stable object structure without modifying the element classes.

## Forces that justify it

Requires at least two of these signals:

- The element hierarchy is stable but new operations are added frequently.
- An operation depends on concrete element types.
- Double dispatch is required.

## Do not use when

- New element types are added frequently.
- A sealed hierarchy with an exhaustive `when` is simpler.
- The visitor needs privileged access that breaks encapsulation.

## Participants

Visitor, ConcreteVisitor, Element, ConcreteElements, ObjectStructure.

## Kotlin/JVM sketch

```kotlin
sealed interface ContentNode {
    fun <R> accept(visitor: ContentVisitor<R>): R
}

data class TextNode(val text: String) : ContentNode {
    override fun <R> accept(visitor: ContentVisitor<R>): R = visitor.visit(this)
}

data class ImageNode(val url: String) : ContentNode {
    override fun <R> accept(visitor: ContentVisitor<R>): R = visitor.visit(this)
}

interface ContentVisitor<R> {
    fun visit(node: TextNode): R
    fun visit(node: ImageNode): R
}
```

## Trade-offs

- Adding an element type forces a change in every visitor.
- Breaks encapsulation through public element internals.
- Double dispatch is opaque to readers who have not seen the pattern.

## Pattern-specific review checks

- [ ] The element hierarchy is stable; count the operations that justify the visitor.
- [ ] Visitors do not mutate element state.
- [ ] Sealed hierarchy plus exhaustive `when` was evaluated first.

- [ ] 

## Related patterns and simpler alternatives

Composite, Iterator, Sealed classes

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/visitor

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
