# Mode B: From Documentation

**Trigger:** Existing documented conventions need to become executable enforcement.

## Procedure

### 1. Discover Documented Conventions

Scan all convention sources in the project:

| Source | What to Look For |
|--------|------------------|
| `AGENTS.md` | Agent-specific rules and constraints |
| `CONTRIBUTING.md` | Contribution guidelines and standards |
| Architecture docs | Structural rules, layering, boundaries |
| ADRs | Decided conventions with rationale |
| Coding standards | Naming, formatting, structure rules |
| Existing lint config | Already-enforced rules |
| Framework docs | Project-specific framework conventions |
| `README.md` | Quick-start conventions and gotchas |

### 2. Separate Enforceable from Contextual

Not every documented convention should be enforced. Classify each:

| Type | Enforceable? | Example |
|------|-------------|---------|
| Structural | Yes | "Domain layer must not import infrastructure" |
| Naming | Yes | "Services end with `Service` suffix" |
| Formatting | Yes | "Imports grouped by scope" |
| Semantic | Partially | "Repositories represent aggregate roots" |
| Contextual | No | "Consider team capacity before adding features" |
| Aspirational | No | "Aim for test coverage above 80%" |

**For semantic conventions:** Document the principle and enforce only the structural constraints that can be checked reliably. Do not create naive rules that reject valid code based on name patterns alone.

### 3. Detect Contradictions and Duplicates

Check for:

- **Contradictions:** Documented convention conflicts with existing tooling
- **Duplicates:** Convention already enforced by compiler, formatter, or linter
- **Obsolete rules:** Convention documented but no longer followed or relevant
- **Conflicting docs:** Multiple documents state different conventions for the same area

**When contradictions exist:** Flag them immediately and request resolution before proceeding. Do not silently choose one side.

### 4. Determine What's Already Enforced

For each enforceable convention:

1. Check the type system and compiler settings
2. Inspect formatter configuration
3. Review linter rules and their current state
4. Check for architecture or framework-level checks

**If a convention is already enforced, record it and move on.** Do not add redundant checkers.

### 5. Propose Enforcement for Gaps

For conventions that are documented but not enforced:

1. Map each gap to the enforcement ladder (see `enforcement-strategy.md`)
2. Group related gaps to minimize configuration changes
3. Estimate existing violations for each gap
4. Present a consolidated proposal showing:
   - What's already enforced
   - What has gaps
   - Proposed enforcement for each gap
   - Existing violations and baseline strategy

### 6. Preserve Documentation as Intent

Enforcement mechanisms implement the convention; documentation explains the intent.

- Keep documentation as the source of truth for **why**
- Let tool configuration be the source of truth for **how**
- Reference the documentation from tool configuration where possible
- Do not duplicate the full convention text in tool configs

**Example:**

```yaml
# detekt.yml - references the intent
rules:
  naming:
    FunctionNaming:
      active: true
      # Convention: "All public functions use camelCase"
      # See: docs/coding-standards.md
      functionPattern: '[a-z][a-zA-Z0-9]*'
```

## Common Scenarios

**CONTRIBUTING.md has naming rules:**
- Check if formatter or linter already covers them
- If not, extend existing config with references to the doc
- Do not create a separate naming script

**Architecture doc defines layer boundaries:**
- Investigate architecture checkers for the language
- Enforce structural dependencies; document semantic boundaries
- Use baseline strategy if legacy violations exist

**ADRs contain enforceable decisions:**
- Extract only the structural constraints
- Document the rationale alongside enforcement
- Skip purely semantic decisions

**Multiple docs contradict each other:**
- Present the contradiction clearly
- Request resolution before enforcing anything
- Do not choose sides silently
