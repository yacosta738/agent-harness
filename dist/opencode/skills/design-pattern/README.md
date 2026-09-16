# GoF Design Pattern Agent Skills

A collection of 22 reusable agent skills, one for each classic Gang of Four
design pattern. The skills are designed for practical software design and code
review, with Kotlin/JVM guidance and explicit pattern-rejection criteria.

## Included skills

### Creational
Factory Method, Abstract Factory, Builder, Prototype, Singleton.

### Structural
Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy.

### Behavioral
Chain of Responsibility, Command, Iterator, Mediator, Memento, Observer, State,
Strategy, Template Method, Visitor.

## Skill structure

Each `<pattern-slug>/SKILL.md` contains:

- Trigger conditions and contraindications
- Canonical participants
- A design-decision workflow
- Kotlin implementation guidance
- An original minimal implementation
- Review and testing checklists
- Common failure modes
- Expected agent output
- Related patterns and simpler alternatives

## Usage

Copy the complete directory or selected pattern folders into the skills directory
supported by the target agent platform.

Example invocation:

> Review this implementation using the Strategy skill. Determine whether Strategy
> is justified before proposing code, and reject it when a simpler Kotlin construct
> is preferable.

Pattern rejection is a valid result. These skills treat patterns as design tools,
not mandatory code templates.

## Source boundary

The catalog and classification follow the public Refactoring.Guru design-pattern
catalog. The agent instructions, explanations, checklists, and Kotlin examples in
this package are original. No proprietary diagrams or paid-book content are
included.

Public references:

- https://refactoring.guru/design-patterns
- https://refactoring.guru/design-patterns/catalog
- https://refactoring.guru/design-patterns/classification
