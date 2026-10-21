# State

## Intent

Change an object's behavior when its internal state changes by delegating state-specific behavior to state objects.

## Forces that justify it

Requires at least two of these signals:

- Behavior varies substantially by lifecycle state.
- Large conditionals repeat state checks across operations.
- Transitions must be explicit and validated.

## Do not use when

- The state machine is small and a sealed class plus `when` is clearer.
- States contain no behavior.
- Transitions can occur from arbitrary locations without a single owner.

## Participants

Context, State, ConcreteStates.

## Kotlin/JVM sketch

```kotlin
sealed interface PublicationState {
    fun publish(): PublicationState
}

data object DraftState : PublicationState {
    override fun publish(): PublicationState = PublishedState
}

data object PublishedState : PublicationState {
    override fun publish(): PublicationState =
        error("Publication is already published")
}

class Publication(
    var state: PublicationState = DraftState
) {
    fun publish() {
        state = state.publish()
    }
}
```

## Trade-offs

- One type per state, and transitions spread across state classes.
- The transition graph stays implicit unless documented.
- Overkill for a small enum whose operations share one behavior.

## Pattern-specific review checks

- [ ] The transition graph is documented and invalid transitions fail explicitly.
- [ ] Every transition has a single owner.
- [ ] `sealed` plus `when` was evaluated and rejected with a stated reason.

- [ ] 

## Related patterns and simpler alternatives

Strategy, State Machine, Type State

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/state

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
