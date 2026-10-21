# Proxy

## Intent

Provide a substitute that controls access to another object while preserving its interface.

## Forces that justify it

Requires at least two of these signals:

- Access requires authorization, caching, lazy loading, remote invocation, or rate limiting.
- The client should not know whether it talks to the real subject.
- Control logic belongs around a specific collaborator.

## Do not use when

- The wrapper adds unrelated business behavior.
- Decorator semantics better describe additive responsibilities.
- A transparent proxy would hide important latency or failure characteristics.

## Participants

Subject, RealSubject, Proxy, Client.

## Kotlin/JVM sketch

```kotlin
interface ProfileRepository {
    suspend fun find(id: String): Profile?
}

class CachedProfileRepository(
    private val target: ProfileRepository
) : ProfileRepository {
    private val cache = mutableMapOf<String, Profile?>()

    override suspend fun find(id: String): Profile? =
        if (cache.containsKey(id)) cache[id]
        else target.find(id).also { cache[id] = it }
}
```

## Trade-offs

- An extra hop adds latency and a new failure point.
- Transparent behavior hides cache staleness or authorization decisions.
- Looks identical to Decorator in code while meaning something different.

## Pattern-specific review checks

- [ ] The proxy controls access, not business behavior.
- [ ] Cache invalidation, TTL, and authorization failure paths are explicit.
- [ ] Added latency and errors remain observable to the caller.

- [ ] 

## Related patterns and simpler alternatives

Decorator, Adapter, Gateway

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/proxy

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
