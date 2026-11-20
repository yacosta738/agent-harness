# Enforcement Strategy

**Rule:** Choose the simplest mechanism that reliably enforces the convention. Stop at the highest rung that works.

## The Enforcement Ladder

### Rung 1: Type System / Compiler

**Use when:** The convention is about types, visibility, or contracts the compiler already checks.

| Convention | Enforcement |
|------------|-------------|
| Null safety | Kotlin `?`, TypeScript strict null checks |
| Visibility | `private`, `internal`, module boundaries |
| Interface contracts | Abstract classes, interfaces, traits |
| Exhaustive matching | Sealed classes, exhaustive when/switch |

**Example:** A convention requiring all error types to implement a common interface is enforced by the type system — no additional tooling needed.

### Rung 2: Formatter

**Use when:** The convention is about whitespace, naming, or structural formatting.

| Convention | Enforcement |
|------------|-------------|
| Naming patterns | KtLint, Prettier, gofmt |
| Import ordering | Formatter import rules |
| Line length | Formatter max line length |
| Trailing commas | Formatter configuration |

**Example:** "All Kotlin files use camelCase for functions" → configure KtLint or Detekt FunctionNaming rule.

### Rung 3: Linter / Static Analysis

**Use when:** The convention is about code structure, complexity, or patterns beyond formatting.

| Language | Linter |
|----------|--------|
| Kotlin/Java | Detekt, Checkstyle, SpotBugs |
| TypeScript/JavaScript | ESLint, TypeScript compiler |
| Rust | Clippy |
| Python | Ruff, Flake8 |
| Go | golangci-lint |

**Example:** "No more than 5 parameters per function" → Detekt `FunctionParameterLimit` rule.

### Rung 4: Framework Architecture Checks

**Use when:** The convention is about architectural boundaries, layer dependencies, or module structure.

| Framework | Tool |
|-----------|------|
| Java/Spring | ArchUnit |
| TypeScript | custom ESLint rules, ts-dep-visibility |
| Kotlin/Multiplatform | Gradle dependency checks |
| Monorepos | nx enforce, turbo |

**Example:** "Domain layer must not depend on infrastructure" → ArchUnit rule checking package dependencies.

**Warning:** Do not implement superficial string matching and claim it guarantees architectural correctness. Use proper architecture checkers that understand the language's dependency model.

### Rung 5: Focused Custom Checks

**Use when:** No existing tool covers the convention, but a small focused check can reliably detect violations.

**Guidelines for custom checks:**

- Keep checks small and focused (single responsibility)
- Target specific violations, not general code quality
- Use the language's AST or analysis API when available
- Avoid regex-based checks when AST parsing is feasible
- Document what the check does and why

**Example:** A custom check that verifies all repository interfaces extend a specific base interface, using the language's AST.

### Rung 6: Documentation Only

**Use when:** Deterministic enforcement would be unreliable, counterproductive, or impossible.

| Convention Type | Why Documentation Only |
|-----------------|------------------------|
| Domain semantics | Requires human understanding |
| Context-dependent rules | Too variable for static checks |
| Aspirational guidelines | No clear violation state |
| High false-positive risk | Enforcement creates more noise than value |

**Example:** "Repositories should represent aggregate roots, not database tables" → document the principle and examples; structural checks cannot verify aggregate boundaries reliably.

## Baseline Strategy for Legacy Code

When enforcing a new convention in an existing repository with violations:

### 1. Identify the Baseline

Run the enforcement mechanism and collect all existing violations. This snapshot is the baseline.

### 2. Use the Tool's Baseline Mechanism

Most tools support baselines natively:

| Tool | Baseline Mechanism |
|------|-------------------|
| Detekt | `baseline.xml` |
| ESLint | `--fix-dry-run` + ignore config |
| ArchUnit | Test exclusion patterns |
| Clippy | `#[allow]` attributes |

**Prefer the tool's baseline mechanism over creating a custom baseline framework.**

### 3. Progressive Adoption Rules

- The baseline captures existing violations only
- New violations are errors, not warnings
- The baseline can only shrink — never grow
- Baseline removal requires explicit approval
- Track baseline violations using existing project mechanisms (issues, tickets)

### 4. Red-Then-Green Verification

Every enforcement change must demonstrate:

**Red:** The mechanism detects a representative violation.

```
# Create a test file that violates the convention
# Run the enforcement mechanism
# Verify it reports the violation
```

**Green:** Compliant code passes without changes.

```
# Verify existing compliant code passes
# Verify the mechanism does not report false positives
# Show actual output, not claims
```

**Without both red and green evidence, the enforcement change is incomplete.**

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Skipping to custom checks | Maintenance burden, false positives | Use the ladder; prefer existing tools |
| No baseline for legacy code | All existing code must be refactored | Use baseline strategy |
| Baseline grows over time | New violations silently accepted | Ensure baseline only shrinks |
| Enforcing unenforceable conventions | False positives, rule fatigue | Use documentation for semantic conventions |
| No red-green verification | Unclear if enforcement works | Always verify both directions |
| Duplicating existing enforcement | Conflicting rules, confusion | Check existing tooling first |
