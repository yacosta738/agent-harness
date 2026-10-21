# Adapter

## Intent

Translate one interface into another interface expected by the client.

## Forces that justify it

Requires at least two of these signals:

- A third-party or legacy API has an incompatible contract.
- The domain must remain isolated from vendor-specific types.
- Data or exceptions require translation at a boundary.

## Do not use when

- The interfaces already match.
- The adapter accumulates business logic rather than boundary translation.
- A Facade is needed to simplify a whole subsystem rather than adapt one contract.

## Participants

Target, Adapter, Adaptee, Client.

## Kotlin/JVM sketch

```kotlin
interface PaymentGateway {
    suspend fun charge(amountInCents: Long): String
}

class VendorPaymentClient {
    suspend fun createPayment(amount: Long): VendorPayment =
        VendorPayment(reference = "vendor-ref")
}

data class VendorPayment(val reference: String)

class VendorPaymentAdapter(
    private val client: VendorPaymentClient
) : PaymentGateway {
    override suspend fun charge(amountInCents: Long): String =
        client.createPayment(amountInCents).reference
}
```

## Trade-offs

- One indirection layer per boundary; stack traces now span vendor and domain frames.
- Translation code drifts when the vendor contract changes.
- The adapter becomes a magnet for business rules that belong to the domain.

## Pattern-specific review checks

- [ ] The adapter translates only: no domain decisions live inside it.
- [ ] Vendor exceptions are mapped to domain errors instead of leaking.
- [ ] Vendor types never appear in domain signatures.

- [ ] 

## Related patterns and simpler alternatives

Facade, Proxy, Anti-Corruption Layer

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/adapter

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
