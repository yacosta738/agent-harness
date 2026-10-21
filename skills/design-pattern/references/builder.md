# Builder

## Intent

Construct complex objects step by step while separating construction from the final representation.

## Forces that justify it

Requires at least two of these signals:

- Construction has many optional parameters or validation rules.
- The same construction process should produce different representations.
- Telescoping constructors or mutable setup sequences reduce readability.

## Do not use when

- A Kotlin data class with named/default parameters is sufficient.
- The object has only a few mandatory fields.
- The builder permits invalid intermediate or final states without validation.

## Participants

Builder, ConcreteBuilder, Director, Product.

## Kotlin/JVM sketch

```kotlin
data class HttpRequest(
    val method: String,
    val url: String,
    val headers: Map<String, String>,
    val body: String?
)

class HttpRequestBuilder {
    private var method = "GET"
    private var url = ""
    private val headers = mutableMapOf<String, String>()
    private var body: String? = null

    fun method(value: String) = apply { method = value }
    fun url(value: String) = apply { url = value }
    fun header(name: String, value: String) = apply { headers[name] = value }
    fun body(value: String?) = apply { body = value }

    fun build(): HttpRequest {
        require(url.isNotBlank()) { "url is required" }
        return HttpRequest(method, url, headers.toMap(), body)
    }
}
```

## Trade-offs

- Duplicates the field list; builder and product drift apart over time.
- Mutability during construction invites invalid intermediate states.
- Kotlin named and default arguments already cover most construction cases.

## Pattern-specific review checks

- [ ] `build()` validates required fields and domain invariants.
- [ ] The builder is not reused across builds or shared across threads.
- [ ] No setter path bypasses validation.

- [ ] 

## Related patterns and simpler alternatives

Abstract Factory, Factory Method, Kotlin DSLs

## Source

Conceptual orientation: https://refactoring.guru/design-patterns/builder

Derived from the classic GoF catalog. Examples and instructions here are original;
no proprietary diagrams or paid content are reproduced.
