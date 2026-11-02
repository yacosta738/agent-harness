# Ejemplos de código

Los cuatro archivos siguientes muestran el mismo contrato: un checkout confirma la compra cuando la pasarela aprueba el pago, rechaza cuando lo deniega y envía el importe esperado a una frontera externa. El doble registra el importe; no se verifican llamadas internas ni su orden.

| Lenguaje | Archivo | Ejecución |
|---|---|---|
| TypeScript | [ejemplo-typescript.test.ts](ejemplo-typescript.test.ts) | Node.js 24.12 o posterior: `node --test skills/testing/test-driven-development/references/ejemplo-typescript.test.ts` |
| Kotlin | [EjemploKotlin.kt](EjemploKotlin.kt) | `kotlinc skills/testing/test-driven-development/references/EjemploKotlin.kt -include-runtime -d /tmp/tdd-kotlin.jar && java -jar /tmp/tdd-kotlin.jar` |
| Java | [EjemploJava.java](EjemploJava.java) | JDK 11 o posterior: `java skills/testing/test-driven-development/references/EjemploJava.java` |
| Rust | [ejemplo_rust.rs](ejemplo_rust.rs) | `rustc --test skills/testing/test-driven-development/references/ejemplo_rust.rs -o /tmp/tdd-rust-tests && /tmp/tdd-rust-tests` |

El ejemplo TypeScript usa el test runner integrado de Node.js y el type stripping nativo, estable desde Node.js 24.12. Los ejemplos Kotlin y Java usan aserciones autocontenidas para evitar una dependencia de framework en la skill. El ejemplo Rust usa el harness integrado. En un proyecto real, adapta la sintaxis al runner existente; no agregues una dependencia solo para copiar estos ejemplos.
