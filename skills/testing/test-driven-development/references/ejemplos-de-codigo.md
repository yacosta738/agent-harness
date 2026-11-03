# Ejemplos de código

Los cuatro archivos siguientes muestran el mismo contrato: un checkout confirma la compra cuando la
pasarela aprueba el pago, rechaza cuando lo deniega y envía el importe esperado a una frontera
externa. El doble registra el importe; no se verifican llamadas internas ni su orden.

Ejecuta estos comandos desde la raíz del repositorio `agent-harness`. Las rutas de los ejemplos son
relativas a ese directorio.

El ejemplo TypeScript usa el test runner integrado de Node.js y el type stripping nativo, estable
desde Node.js 24.12.

## TypeScript

Requiere Node.js 24.12 o posterior.

```text
node --test skills/testing/test-driven-development/references/ejemplo-typescript.test.ts
```

## Kotlin

El compilador crea `tdd-kotlin.jar` en la raíz del repositorio. Ejecuta cada línea como un comando
separado:

```text
kotlinc skills/testing/test-driven-development/references/EjemploKotlin.kt -include-runtime -d tdd-kotlin.jar
java -jar tdd-kotlin.jar
```

## Java

Requiere JDK 11 o posterior.

```text
java skills/testing/test-driven-development/references/EjemploJava.java
```

## Rust

En PowerShell o Command Prompt, compila y ejecuta con estas líneas separadas:

```powershell
rustc --test skills/testing/test-driven-development/references/ejemplo_rust.rs -o tdd-rust-tests.exe
.\tdd-rust-tests.exe
```

En macOS o Linux, usa:

```sh
rustc --test skills/testing/test-driven-development/references/ejemplo_rust.rs -o tdd-rust-tests
./tdd-rust-tests
```

Los ejemplos Kotlin y Java usan aserciones autocontenidas para evitar una dependencia de framework
en la skill. El ejemplo Rust usa el harness integrado. En un proyecto real, adapta la sintaxis al
runner existente; no agregues una dependencia solo para copiar estos ejemplos. Puedes borrar
`tdd-kotlin.jar` y el binario Rust después de ejecutar los ejemplos.
