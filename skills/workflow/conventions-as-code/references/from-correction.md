# Mode A: From Correction

**Trigger:** A review correction or recurring mistake appears repeatedly across changes.

## Procedure

### 1. Pin Down the Correction

Extract the exact convention from the correction:

- What is the specific rule being violated?
- What files or patterns does it apply to?
- Is this the first time this correction appears, or has it recurred?

**If this is a one-off correction with no history of repetition, do not create a convention.** Document the feedback briefly and move on.

### 2. Determine Durability

Ask whether this correction expresses a durable convention:

| Signal | Likely Durable | Likely One-Off |
|--------|---------------|----------------|
| Appears in 3+ reviews | Yes | — |
| Referenced in project docs | Yes | — |
| Tied to architecture decision | Yes | — |
| Single file, specific context | — | Yes |
| Personal style preference | — | Yes |
| Workaround for known issue | — | Yes |

**If the correction is not durable, skip enforcement.** A single review comment does not establish a convention.

### 3. Check Existing Tooling

Before proposing any enforcement, inspect what already exists:

- Does the formatter already handle this? (e.g., import ordering, naming)
- Does the linter have a rule for this? (e.g., Detekt, ESLint, Clippy)
- Does the type system or compiler already prevent this?
- Is there an architecture check that covers this?

**If existing tooling already enforces the convention, report it and stop.** Do not add a second checker.

### 4. Propose Enforcement

When existing tooling does not cover the convention:

1. Identify the highest rung on the enforcement ladder that reliably handles this convention
2. Explain why higher-priority options (rungs above the chosen one) do not apply
3. Show what configuration change is needed
4. Estimate the scope: how many files are affected, how many existing violations exist

Present the proposal to the user with:

- The convention statement
- The enforcement mechanism and rung
- Existing violations count (if any)
- Tradeoffs and false-positive risk

### 5. Implement When Authorized

Only after explicit authorization:

1. Make the minimal configuration change
2. If legacy violations exist, apply baseline strategy (see `enforcement-strategy.md`)
3. Do not refactor unrelated code to satisfy the new rule

### 6. Verify with Red-Green

Use `verification-before-completion` standards:

1. **Red:** Demonstrate the convention catches a representative violation
2. **Green:** Demonstrate compliant code passes without changes
3. Show actual output, not claims

**Example:**

```
# Red: Violation detected
$ detekt --input src/
> [WARNING] Function 'badFunctionName' must match pattern '[a-z][a-zA-Z0-9]*'

# Green: Compliant code passes
$ detekt --input src/
> Build completed with no warnings.
```

**Note:** The above command is illustrative. Use the project's actual Detekt configuration (e.g., `detekt.yml` with `FunctionNaming` rule) rather than ad-hoc CLI flags.

## Common Scenarios

**Repeated naming correction:**
- Check formatter first (KtLint, Prettier)
- Then linter (Detekt, ESLint naming rules)
- Only create custom checks if neither covers the pattern

**Import ordering correction:**
- Formatter almost always handles this (ImportOrder in Checkstyle, eslint-plugin-import)
- Extend existing config; do not create a new script

**Architecture boundary violation:**
- Investigate architecture checkers (ArchUnit for Java, custom lint for TypeScript)
- Do not implement string matching and claim it guarantees correctness
- May require rung 4 or 5 of the enforcement ladder

**Domain terminology correction:**
- Reuse `domain-language` skill for glossary management
- Document the term; enforce only structural aspects if checkable
