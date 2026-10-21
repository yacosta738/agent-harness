---
name: design-pattern
description: >
  Evaluate, apply, review, or refactor code using classic Gang of Four (GoF)
  design patterns. Biased toward Kotlin/JVM backends with forces-first
  justification, progressive disclosure of per-pattern references, and explicit
  rejection criteria when language features or simpler designs suffice.
---

# GoF Design Patterns

Apply design patterns as trade-off tools, not default templates. A pattern is
justified only when real structural forces require it and simpler language
constructs (lambdas, sealed hierarchies, default arguments, plain functions)
are insufficient. Pattern rejection is a successful outcome.

## Progressive disclosure

Do not load all pattern references up front. Identify candidate patterns from the
table below, then read only the relevant reference from `references/<slug>.md`.

| Pattern | Category | Intent | Reference |
|---|---|---|---|
| **Factory Method** | Creational | Defer concrete instantiation to subclasses or factory functions behind an interface. | [references/factory-method.md](references/factory-method.md) |
| **Abstract Factory** | Creational | Create families of related or compatible objects without coupling to concrete classes. | [references/abstract-factory.md](references/abstract-factory.md) |
| **Builder** | Creational | Construct complex objects step by step; evaluate against named/default arguments first. | [references/builder.md](references/builder.md) |
| **Prototype** | Creational | Create new objects by copying an existing prototype; evaluate against `copy()` first. | [references/prototype.md](references/prototype.md) |
| **Singleton** | Creational | Ensure a single process-wide instance; evaluate against DI container scoping first. | [references/singleton.md](references/singleton.md) |
| **Adapter** | Structural | Translate an incompatible vendor/legacy interface into the domain contract. | [references/adapter.md](references/adapter.md) |
| **Bridge** | Structural | Decouple abstraction and implementation so both hierarchies evolve independently. | [references/bridge.md](references/bridge.md) |
| **Composite** | Structural | Treat individual objects and tree compositions uniformly through a common contract. | [references/composite.md](references/composite.md) |
| **Decorator** | Structural | Attach responsibilities dynamically by wrapping objects conforming to the same interface. | [references/decorator.md](references/decorator.md) |
| **Facade** | Structural | Expose a focused, simplified entry point over a complex subsystem. | [references/facade.md](references/facade.md) |
| **Flyweight** | Structural | Share immutable intrinsic state across many fine-grained objects to cut memory. | [references/flyweight.md](references/flyweight.md) |
| **Proxy** | Structural | Provide a surrogate controlling access, caching, or lazy initialization of another object. | [references/proxy.md](references/proxy.md) |
| **Chain of Responsibility** | Behavioral | Pass a request along an ordered chain of handlers until one processes or rejects it. | [references/chain-of-responsibility.md](references/chain-of-responsibility.md) |
| **Command** | Behavioral | Encapsulate a request as an object for queueing, retry, audit, idempotency, or undo. | [references/command.md](references/command.md) |
| **Iterator** | Behavioral | Traverse an aggregate without exposing its structure; evaluate against `Sequence` first. | [references/iterator.md](references/iterator.md) |
| **Mediator** | Behavioral | Centralize communication among collaborating components to eliminate many-to-many coupling. | [references/mediator.md](references/mediator.md) |
| **Memento** | Behavioral | Snapshot and restore internal state without exposing representation details. | [references/memento.md](references/memento.md) |
| **Observer** | Behavioral | Notify subscribers of state changes; evaluate against reactive flows or message brokers. | [references/observer.md](references/observer.md) |
| **State** | Behavioral | Alter behavior when internal state changes; evaluate against `sealed` class + `when`. | [references/state.md](references/state.md) |
| **Strategy** | Behavioral | Encapsulate interchangeable algorithms behind a contract; evaluate against a lambda first. | [references/strategy.md](references/strategy.md) |
| **Template Method** | Behavioral | Invariant algorithm skeleton with customized steps; evaluate against Strategy composition. | [references/template-method.md](references/template-method.md) |
| **Visitor** | Behavioral | Add operations to a stable hierarchy without modifying element types; evaluate against `when`. | [references/visitor.md](references/visitor.md) |

## Decision workflow

1. **Describe the problem without pattern names.** State the business force, the axis of variation, and who the callers are.
2. **Identify what must remain stable and what must vary.** Do not add seams for variability that is purely speculative.
3. **Compare with simpler alternatives.** Check Kotlin-native constructs (lambdas, extension functions, sealed hierarchies, data class `copy()`, default arguments) and DI framework capabilities before introducing pattern types.
4. **Read the candidate reference.** Open `references/<slug>.md` and verify whether at least two trigger signals match and no disqualifying conditions apply.
5. **Establish the client-facing contract.** Interfaces must reflect domain intent, never leaky internal mechanics.
6. **Assign responsibilities to participants.** Prefer composition over inheritance unless inheritance is intrinsic (e.g., Template Method).
7. **Preserve domain invariants and dependency direction.** Patterns must not invert architecture boundaries.
8. **Implement the smallest viable version.** Avoid speculative generalizations.
9. **Write tests proving substitution, collaboration, and failure behavior.**
10. **Record why the pattern is justified or rejected.** State the alternative rejected and the trade-off accepted.

## Kotlin implementation guidance

- Prefer immutable values (`val`, immutable collections) and constructor injection.
- Use `sealed interface` or `sealed class` where the implementation set is closed, enabling compiler-enforced exhaustive `when`.
- Use `fun interface` (SAM) for single-operation strategies, factories, handlers, or observers so callers can pass lambdas.
- Prefer data classes for messages, commands, snapshots, and query models; enforce validation at construction (`init` block or smart constructor).
- Avoid unnecessary abstract classes where an interface suffices.
- Avoid thread-unsafe shared mutable state; scope state via coroutines, actors, or concurrency-safe primitives.
- Map third-party exceptions to domain error types at the boundary instead of leaking raw transport/vendor exceptions.

## Review checklist

- [ ] The problem exhibits the forces this pattern resolves (minimum two signals).
- [ ] Simpler language features (lambdas, sealed types, default arguments) were evaluated and found insufficient.
- [ ] The abstraction is stable, domain-meaningful, and does not leak implementation details.
- [ ] Concrete implementations remain substitutable without client-side type introspection (`is` checks).
- [ ] Domain logic has not leaked into orchestration, wrapping, or infrastructure layers.
- [ ] Failures, cancellations, timeouts, and edge cases are modeled explicitly.
- [ ] Pattern-specific checks from `references/<slug>.md` pass.

## Common failure modes

- **Patternitis**: applying patterns to problems that simple procedural or functional code solves with less ceremony.
- **Speculative flexibility**: designing for variants that never materialize, paying ongoing maintenance for zero benefit.
- **Ceremony without variability**: introducing an interface with exactly one permanent production implementation and no testing need.
- **Leaky abstractions**: client code checking concrete types or handling vendor-specific error codes through the abstraction.
- **Hidden operational semantics**: wrappers obscuring latency, retries, transactional boundaries, or thread-safety guarantees.
- **Misplaced business rules**: orchestration wrappers (adapters, proxies, facades) becoming the de facto domain model.

## Output expected from the agent

When this skill is invoked to evaluate, apply, or review a pattern, provide:

1. **Force analysis**: the concrete forces, axes of variation, and call-site needs.
2. **Fit verdict**: `APPLY`, `CONSIDER`, or `REJECT` (with concrete reasons).
3. **Mapped participants**: canonical pattern roles mapped to domain types.
4. **Minimal design or patch**: smallest implementation resolving the forces.
5. **Kotlin code and tests**: showing substitutability, collaboration, and error paths.
6. **Trade-offs and rejected alternatives**: explicit record of what simpler approach was evaluated and why the pattern was chosen.
