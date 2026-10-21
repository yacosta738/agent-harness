# Chain Of Responsibility

## Intent

Pass a request through an ordered chain of handlers until processing is completed or rejected.

## Forces that justify it

Requires at least two of these signals:

- A request undergoes a configurable sequence of checks or transformations.
- The sender should not know which handler will act.
- Handlers may short-circuit processing.

## Do not use when

- Processing order is implicit or unstable.
- Every handler always executes and a pipeline abstraction would be clearer.
- Failures disappear because no handler accepts the request.

## Participants

Handler, BaseHandler, ConcreteHandlers, Client.

## Kotlin/JVM sketch

```kotlin
fun interface RequestHandler {
    suspend fun handle(request: Request, next: suspend (Request) -> Response): Response
}

class AuthenticationHandler : RequestHandler {
    override suspend fun handle(
        request: Request,
        next: suspend (Request) -> Response
    ): Response {
        require(request.userId != null) { "Unauthenticated" }
        return next(request)
    }
}
```

## Trade-offs

- Control flow becomes implicit; debugging requires reconstructing the assembled chain.
- Unhandled requests can disappear silently when no handler reports rejection.
- Order coupling is invisible in the type system.

## Pattern-specific review checks

- [ ] Chain order is explicit at the composition root and covered by a test.
- [ ] An unhandled request yields an explicit error, never a silent pass.
- [ ] Each handler documents its stop condition and has one responsibility.

- [ ] 

## Related patterns and simpler alternatives

Decorator, Middleware, Pipeline

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/chain-of-responsibility

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
