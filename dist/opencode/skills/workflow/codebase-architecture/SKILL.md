---
name: codebase-architecture
description: Use when the user asks to improve architecture, refactor complex
  areas, reduce technical debt, consolidate shallow modules, reduce tight
  coupling, design cleaner interfaces, or make the codebase more testable.
---

# Codebase Architecture Audit & Improvement

Use this skill to identify architectural friction and propose **deepening
opportunities** — refactoring paths that turn shallow modules into deep,
high-leverage modules.

The primary goals are testability, isolation, and AI-navigability.

## 1. Glossary (Strict Vocabulary)

Use these terms exactly. Consistent language is crucial to avoid ambiguity. Do
not substitute with generic terms like "component," "service," or "API".

- **Module**: Anything with an interface and an implementation (function, class,
  package, slice).
- **Interface**: Everything a caller must know to use the module correctly
  (types, invariants, ordering constraints, error modes, configuration). Not
  just the type signature.
- **Implementation**: The code inside a module.
- **Depth**: Leverage at the interface. A module is **deep** when a large amount
  of behavior sits behind a small interface. A module is **shallow** when the
  interface is nearly as complex as the implementation.
- **Seam**: A place where you can alter behavior without editing in that place.
  The location where an interface lives.
- **Adapter**: A concrete thing that satisfies an interface at a seam (describes
  a role, not substance).
- **Leverage**: What callers get from depth.
- **Locality**: What maintainers get from depth (change, bugs, and knowledge
  concentrate in one place).

### Core Principles

- **The Deletion Test**: Imagine deleting the module. If complexity vanishes, it
  was a shallow pass-through.
- **The Seam Test**: Can you swap the implementation without touching callers? If
  not, the interface leaks.
- **The Test Harness Test**: Can you test the module in isolation? If not, it's
  coupled.

## 2. Audit Workflow

### Step 1: Map the Modules

Identify the major modules in the area of concern. For each module, note:

- Its interface (what callers see)
- Its implementation (what it does internally)
- Its dependencies (what it calls)

### Step 2: Measure Depth

For each module, ask:

- **Interface complexity**: How much must a caller know?
- **Implementation complexity**: How much does the module do?
- **Depth ratio**: Implementation complexity / Interface complexity

High-depth modules are good. Low-depth modules are candidates for deepening.

### Step 3: Identify Shallow Modules

Look for:

- **Pass-through modules**: Functions that just call another function with minor
  transformation.
- **Configuration wrappers**: Modules that exist only to hold config.
- **Getter/setter classes**: Classes that are just bags of fields.
- **Orchestrators**: Modules that coordinate other modules but add no logic.

### Step 4: Propose Deepening

For each shallow module, propose one of:

- **Inline it**: If it adds no value, delete it and move logic to caller.
- **Absorb it**: Merge it into a deeper neighbor module.
- **Deepen it**: Add more behavior behind the same interface.
- **Reframe it**: Change the interface to hide more implementation.

## 3. Deepening Patterns

### Pattern: Inline Pass-Through

**Before:**

```typescript
function getUser(id: string) {
  return userRepository.findById(id);
}
```

**After:** Delete `getUser`, call `userRepository.findById` directly.

### Pattern: Absorb Configuration

**Before:**

```typescript
class EmailConfig {
  host: string;
  port: number;
}

class EmailSender {
  constructor(private config: EmailConfig) {}
  send(to: string, body: string) { /* ... */ }
}
```

**After:**

```typescript
class EmailSender {
  constructor(private host: string, private port: number) {}
  send(to: string, body: string) { /* ... */ }
}
```

### Pattern: Deepen by Adding Behavior

**Before:**

```typescript
function validateEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}
```

**After:**

```typescript
function validateEmail(email: string): { valid: boolean; reason?: string } {
  if (!email) return { valid: false, reason: "Email is required" };
  if (!/\S+@\S+\.\S+/.test(email)) {
    return { valid: false, reason: "Invalid email format" };
  }
  return { valid: true };
}
```

### Pattern: Reframe Interface to Hide Implementation

**Before:**

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
}
```

**After:**

```typescript
interface UserRepository {
  find(criteria: { id?: string; email?: string; username?: string }):
    Promise<User | null>;
}
```

## 4. Output Format

Present findings as:

```markdown
## Architecture Audit: [Area Name]

### Shallow Modules Identified

1. **[Module Name]**
   - Interface: [brief description]
   - Implementation: [brief description]
   - Depth: Low (interface ~= implementation)
   - Recommendation: [Inline | Absorb | Deepen | Reframe]

### Deepening Opportunities

1. **[Opportunity Name]**
   - Current state: [description]
   - Proposed state: [description]
   - Benefit: [testability | isolation | leverage]
   - Effort: [Low | Medium | High]
```

## 5. When NOT to Deepen

- **Stable, well-understood pass-throughs**: If a module is a stable adapter
  between two systems, leave it.
- **Framework requirements**: If the framework demands a certain structure, don't
  fight it.
- **Performance-critical paths**: If inlining would hurt performance, keep the
  module.
