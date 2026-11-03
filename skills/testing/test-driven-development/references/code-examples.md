# Code examples

The four files below show the same contract: a checkout confirms the purchase when the gateway
approves the payment, rejects it when the gateway declines, and sends the expected amount to an
external boundary. The double records the amount; internal calls and their order are not verified.

Run these commands from the root of the `agent-harness` repository. The example paths are relative to
that directory.

The TypeScript example uses the Node.js built-in test runner and native type stripping, stable since
Node.js 24.12.

## TypeScript

Requires Node.js 24.12 or later.

```text
node --test skills/testing/test-driven-development/references/example.test.ts
```

## Kotlin

The compiler creates `tdd-kotlin.jar` in the repository root. Run each line as a separate command:

```text
kotlinc skills/testing/test-driven-development/references/Example.kt -include-runtime -d tdd-kotlin.jar
java -jar tdd-kotlin.jar
```

## Java

Requires JDK 11 or later.

```text
java skills/testing/test-driven-development/references/Example.java
```

## Rust

In PowerShell or Command Prompt, compile and run with these separate lines:

```powershell
rustc --test skills/testing/test-driven-development/references/example.rs -o tdd-rust-tests.exe
.\tdd-rust-tests.exe
```

On macOS or Linux, use:

```sh
rustc --test skills/testing/test-driven-development/references/example.rs -o tdd-rust-tests
./tdd-rust-tests
```

The Kotlin and Java examples use self-contained assertions to avoid a framework dependency inside the
skill. The Rust example uses the built-in harness. In a real project, adapt the syntax to the existing
runner; do not add a dependency just to copy these examples. You can delete `tdd-kotlin.jar` and the
Rust binary after running the examples.
