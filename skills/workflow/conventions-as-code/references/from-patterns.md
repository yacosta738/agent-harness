# Mode C: From Patterns

**Trigger:** The user asks to discover implicit conventions from the repository's code patterns.

## Procedure

### 1. Mine Code Patterns

Systematically analyze the repository for repeated structures:

| Pattern Type | How to Mine |
|--------------|-------------|
| Naming patterns | Scan class, function, file naming across packages |
| Package structure | Analyze directory hierarchy and module boundaries |
| Import patterns | Check import ordering, grouping, and forbidden imports |
| Dependency direction | Map which layers/packages depend on which |
| Configuration patterns | Check build files, lint configs, formatter settings |
| Test patterns | Analyze test naming, placement, and structure |
| Error handling | Check exception types, result types, error conventions |

### 2. Distinguish Intentional from Incidental

**Frequency is evidence, not authority.** A pattern appearing everywhere does not make it a convention.

Classify each discovered pattern:

| Classification | Characteristics | Action |
|----------------|-----------------|--------|
| **Intentional convention** | Documented, consistent, has rationale | Formalize if not already enforced |
| **Incidental pattern** | Common but no documentation, may be historical | Present as finding, do not enforce |
| **Legacy technical debt** | Old pattern being replaced | Do not promote; may need migration plan |
| **Transitional code** | Mixed patterns during migration | Wait for migration to complete |
| **Contradicts architecture** | Pattern exists but violates documented arch | Flag as violation, not convention |

**How to distinguish:**

1. Check if the pattern is documented anywhere (AGENTS.md, CONTRIBUTING.md, ADRs, README)
2. Check if existing tooling enforces it (linter, formatter, architecture checks)
3. Check Git history: was this pattern introduced deliberately or accumulated?
4. Check for exceptions: intentional conventions have few exceptions; incidental patterns have many
5. Ask: if a new developer introduced this pattern, would it be accepted in review?

### 3. Weigh Intent vs Direction vs Volume

When patterns are ambiguous, weigh three factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Intent** | Highest | Is there documentation, ADRs, or tooling that shows deliberate choice? |
| **Direction** | Medium | Is the codebase moving toward or away from this pattern? |
| **Volume** | Lowest | How many files follow this pattern? |

**Examples:**

- High intent, low volume → Likely a new convention being adopted. Formalize it.
- Low intent, high volume → Likely an incidental pattern. Do not enforce without confirmation.
- High intent, high volume → Established convention. Check if already enforced.
- Low intent, low volume → Noise. Ignore.

### 4. Present Alternatives When Ambiguous

When the intended convention is unclear:

1. Present the discovered patterns with their classifications
2. Show conflicting patterns where they exist
3. Explain what each interpretation would mean if enforced
4. **Request a decision before enforcing any pattern**

**Example presentation:**

```
Discovered naming patterns for service classes:
- 45 files use `*Service` suffix (e.g., UserService)
- 12 files use `*Manager` suffix (e.g., UserManager)
- 8 files use `*Handler` suffix (e.g., RequestHandler)

No documentation clarifies the intended convention.
Options:
A. Enforce `*Service` suffix (most common)
B. Enforce `*Service` or `*Manager` (two established patterns)
C. No enforcement — pattern appears transitional
D. Other convention (specify)

Please decide which pattern to formalize.
```

### 5. Request Decision Before Enforcing

**Never enforce a discovered pattern without explicit confirmation.** The pattern may be:

- Accidental accumulation that the team wants to change
- Transitional code during a migration
- A pattern that works but isn't the intended convention
- Technical debt that should be addressed differently

Present findings, propose options, and wait for authorization.

## Common Scenarios

**All repositories extend a base class:**
- Check if this is documented or enforced
- If undocumented, present as finding: "All 23 repositories extend `BaseRepository`. Is this intentional?"
- Do not enforce the base class pattern without confirmation

**Mixed naming conventions across modules:**
- Map which modules use which convention
- Check if modules have different ownership or history
- Present the split pattern and request decision
- Do not choose the majority pattern automatically

**Pattern contradicts documented architecture:**
- Flag the contradiction clearly
- Documented architecture expresses known intent, but it may be outdated
- Present both the documentation and the code evidence side by side
- Request a decision: is the documentation current (enforce it) or obsolete (update it)?
- Do not automatically enforce either side without confirmation

**New pattern emerging alongside old pattern:**
- Check Git history for recent changes
- Determine if this is a migration in progress
- If migration, wait for completion before formalizing
- If ambiguous, present both patterns and request decision

## Anti-Patterns

| Anti-Pattern | Why It's Wrong |
|--------------|----------------|
| Enforcing the most common pattern | Frequency ≠ intent; majority may be legacy debt |
| Creating rules for transitional code | The pattern is changing; enforcement will fight migration |
| Automatically enforcing documented architecture | Documentation may be outdated; verify current intent before enforcing |
| Automatically enforcing code patterns | The team may want to change the discovered pattern |
| Treating all patterns as conventions | Many patterns are incidental, not intentional |
| Ignoring contradictions between docs and code | Present the gap and request a decision; don't choose sides silently |
