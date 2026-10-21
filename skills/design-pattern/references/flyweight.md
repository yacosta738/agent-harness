# Flyweight

## Intent

Reduce memory usage by sharing immutable intrinsic state across many fine-grained objects.

## Forces that justify it

Requires at least two of these signals:

- Very large numbers of similar objects dominate memory.
- Most object state is immutable and repeated.
- Extrinsic context can be supplied by callers.

## Do not use when

- No measurement shows memory pressure.
- Shared state is mutable.
- Lookup/caching complexity costs more than the memory saved.

## Participants

Flyweight, ConcreteFlyweight, FlyweightFactory, Context, Client.

## Kotlin/JVM sketch

```kotlin
data class IconStyle(
    val glyph: String,
    val fontFamily: String
)

object IconStyleFactory {
    private val cache = mutableMapOf<Pair<String, String>, IconStyle>()

    @Synchronized
    fun get(glyph: String, fontFamily: String): IconStyle =
        cache.getOrPut(glyph to fontFamily) {
            IconStyle(glyph, fontFamily)
        }
}

data class PositionedIcon(
    val x: Int,
    val y: Int,
    val style: IconStyle
)
```

## Trade-offs

- Splits state into intrinsic and extrinsic, complicating every call site.
- Shared mutable state becomes an aliasing bug.
- Lookup cost can exceed the allocation it saves.

## Pattern-specific review checks

- [ ] A measurement shows the memory pressure before and after the change.
- [ ] Intrinsic state is immutable and safe to share across threads.
- [ ] The factory cache has a bound or a documented lifetime.

- [ ] 

## Related patterns and simpler alternatives

Object Pool, Cache, Prototype

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/flyweight

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
